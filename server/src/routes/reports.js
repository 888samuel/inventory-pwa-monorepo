import { Router } from 'express';
import { getDb } from '../db.js';
import { shopScope } from '../shopScope.js';
import { hasPermission, membershipFor } from '../permissions.js';

const router = Router();

const movementBranch = `
  JOIN branches ON branches.id = CASE
    WHEN stock_transactions.type = 'OUT' THEN stock_transactions.source_branch_id
    ELSE stock_transactions.destination_branch_id
  END
  JOIN memberships ON memberships.organization_id = branches.organization_id
    AND memberships.user_id = $1
`;

const movementWhere = `
  stock_transactions.type IN ('IN', 'OUT')
  AND ($4::text IS NULL OR branches.name = $4)
  AND ${shopScope()}
`;

const invoiceBank = `(
  $5::text IS NULL
  OR ($5 = 'cash' AND stock_transactions.payment = 'cash')
  OR (
    $5 <> 'cash'
    AND stock_transactions.payment = 'transfer'
    AND stock_transactions.bank_name = $5
  )
)`;

const collectionBank = `(
  $5::text IS NULL
  OR ($5 = 'cash' AND credit_payments.payment = 'cash')
  OR (
    $5 <> 'cash'
    AND credit_payments.payment = 'transfer'
    AND credit_payments.bank_name = $5
  )
)`;

const pinParams = `
  AND $2::timestamptz IS NOT NULL
  AND $3::timestamptz IS NOT NULL
  AND ($5::text IS NULL OR $5::text IS NOT NULL)
  AND length($6::text) > 0
`;

const openBalance = `(
  stock_transactions.unit_price * stock_transactions.quantity
  - stock_transactions.paid_cents
  - COALESCE((
      SELECT SUM(credit_payments.amount_cents)
      FROM credit_payments
      WHERE credit_payments.sale_id = stock_transactions.id
        AND credit_payments.created_at < $3
    ), 0)
)`;

function num(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function emptyDay(date) {
  return {
    date,
    salesCents: 0,
    purchasesCents: 0,
    cashInCents: 0,
    cashOutCents: 0,
    bankInCents: 0,
    bankOutCents: 0,
  };
}

function zonedDay(iso, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function addDay(ymd) {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

function eachDay(fromIso, toIso, timeZone) {
  const start = zonedDay(fromIso, timeZone);
  const end = zonedDay(new Date(new Date(toIso).getTime() - 1).toISOString(), timeZone);
  const dates = [];
  let cursor = start;
  while (cursor <= end && dates.length < 400) {
    dates.push(cursor);
    cursor = addDay(cursor);
  }
  return dates;
}

function readFilters(query) {
  const from = new Date(query.from);
  const to = new Date(query.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return { error: 'Choose a start and an end' };
  }
  const span = to.getTime() - from.getTime();
  if (span > 370 * 24 * 60 * 60 * 1000) {
    return { error: 'Choose 370 days or fewer' };
  }
  const shopRaw = String(query.shop || '').trim();
  const shop = !shopRaw || shopRaw === 'all' ? null : shopRaw;
  if (shop && shop.length > 200) return { error: 'Choose a shop' };
  const bankRaw = String(query.bank || '').trim();
  const bank = !bankRaw || bankRaw === 'all' ? null : bankRaw;
  if (bank && bank.length > 80) return { error: 'Choose a bank' };
  const timeZone = String(query.timeZone || 'UTC').trim();
  if (!/^[A-Za-z0-9_+/-]{1,64}$/.test(timeZone)) {
    return { error: 'Choose a time zone' };
  }
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    shop,
    bank,
    timeZone,
  };
}

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const filters = readFilters(req.query);
  if (filters.error) return res.status(400).json({ error: filters.error });

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'report')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot view reports' });
    }
    try {
      await client.query(`SELECT now() AT TIME ZONE $1`, [filters.timeZone]);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '22023') return res.status(400).json({ error: 'Choose a time zone' });
      throw error;
    }

    const params = [userId, filters.from, filters.to, filters.shop, filters.bank, filters.timeZone];

    const banks = await client.query(
      `SELECT name FROM banks WHERE organization_id = $1 ORDER BY lower(name), name`,
      [membership.organization_id]
    );

    const booked = await client.query(
      `SELECT (stock_transactions.created_at AT TIME ZONE $6)::date::text AS day,
              stock_transactions.type,
              COUNT(*)::bigint AS count,
              COALESCE(SUM(stock_transactions.quantity), 0)::bigint AS units,
              COALESCE(SUM(stock_transactions.unit_price * stock_transactions.quantity), 0)::bigint AS billed,
              COALESCE(SUM(stock_transactions.unit_price * stock_transactions.quantity) FILTER (WHERE stock_transactions.payment = 'cash'), 0)::bigint AS billed_cash,
              COALESCE(SUM(stock_transactions.unit_price * stock_transactions.quantity) FILTER (WHERE stock_transactions.payment = 'transfer'), 0)::bigint AS billed_transfer,
              COALESCE(SUM(stock_transactions.unit_price * stock_transactions.quantity) FILTER (WHERE stock_transactions.payment = 'credit'), 0)::bigint AS billed_credit,
              COALESCE(SUM(stock_transactions.paid_cents) FILTER (WHERE stock_transactions.payment = 'cash'), 0)::bigint AS cash_paid,
              COALESCE(SUM(stock_transactions.paid_cents) FILTER (WHERE stock_transactions.payment = 'transfer'), 0)::bigint AS bank_paid,
              COALESCE(SUM(stock_transactions.paid_cents) FILTER (WHERE stock_transactions.payment = 'credit'), 0)::bigint AS counter_paid
       FROM stock_transactions
       ${movementBranch}
       WHERE ${movementWhere}
         AND stock_transactions.created_at >= $2
         AND stock_transactions.created_at < $3
         AND ${invoiceBank}
         ${pinParams}
       GROUP BY 1, 2`,
      params
    );

    const collections = await client.query(
      `SELECT (credit_payments.created_at AT TIME ZONE $6)::date::text AS day,
              stock_transactions.type,
              COALESCE(SUM(credit_payments.amount_cents) FILTER (WHERE credit_payments.payment = 'cash'), 0)::bigint AS cash_cents,
              COALESCE(SUM(credit_payments.amount_cents) FILTER (WHERE credit_payments.payment = 'transfer'), 0)::bigint AS bank_cents
       FROM credit_payments
       JOIN stock_transactions ON stock_transactions.id = credit_payments.sale_id
       ${movementBranch}
       WHERE ${movementWhere}
         AND credit_payments.created_at >= $2
         AND credit_payments.created_at < $3
         AND ${collectionBank}
         ${pinParams}
       GROUP BY 1, 2`,
      params
    );

    const bankFlows = await client.query(
      `SELECT bank,
              COALESCE(SUM(in_cents), 0)::bigint AS in_cents,
              COALESCE(SUM(out_cents), 0)::bigint AS out_cents
       FROM (
         SELECT stock_transactions.bank_name AS bank,
                CASE WHEN stock_transactions.type = 'OUT' THEN stock_transactions.paid_cents ELSE 0 END AS in_cents,
                CASE WHEN stock_transactions.type = 'IN' THEN stock_transactions.paid_cents ELSE 0 END AS out_cents
         FROM stock_transactions
         ${movementBranch}
         WHERE ${movementWhere}
           AND stock_transactions.payment = 'transfer'
           AND stock_transactions.created_at >= $2
           AND stock_transactions.created_at < $3
           AND ($5::text IS NULL OR ($5 <> 'cash' AND stock_transactions.bank_name = $5))
         UNION ALL
         SELECT credit_payments.bank_name,
                CASE WHEN stock_transactions.type = 'OUT' THEN credit_payments.amount_cents ELSE 0 END,
                CASE WHEN stock_transactions.type = 'IN' THEN credit_payments.amount_cents ELSE 0 END
         FROM credit_payments
         JOIN stock_transactions ON stock_transactions.id = credit_payments.sale_id
         ${movementBranch}
         WHERE ${movementWhere}
           AND credit_payments.payment = 'transfer'
           AND credit_payments.created_at >= $2
           AND credit_payments.created_at < $3
           AND ($5::text IS NULL OR ($5 <> 'cash' AND credit_payments.bank_name = $5))
       ) flows
       WHERE TRUE
         ${pinParams}
       GROUP BY bank
       ORDER BY bank`,
      params
    );

    const byShop = await client.query(
      `SELECT branches.name AS shop,
              stock_transactions.type,
              COALESCE(SUM(stock_transactions.unit_price * stock_transactions.quantity), 0)::bigint AS cents
       FROM stock_transactions
       ${movementBranch}
       WHERE ${movementWhere}
         AND stock_transactions.created_at >= $2
         AND stock_transactions.created_at < $3
         AND ${invoiceBank}
         ${pinParams}
       GROUP BY branches.name, stock_transactions.type`,
      params
    );

    const shopList = await client.query(
      `SELECT branches.name
       FROM branches
       JOIN memberships ON memberships.organization_id = branches.organization_id
         AND memberships.user_id = $1
       WHERE ${shopScope()}
         AND ($4::text IS NULL OR branches.name = $4)
         ${pinParams}
       ORDER BY branches.name`,
      params
    );

    const owedToYou = await client.query(
      `SELECT branches.name AS shop,
              customers.id AS party_id,
              customers.name AS party,
              COUNT(*)::bigint AS invoices,
              COALESCE(SUM${openBalance}, 0)::bigint AS cents
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.source_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
         AND memberships.user_id = $1
       JOIN customers ON customers.id = stock_transactions.customer_id
       WHERE stock_transactions.type = 'OUT'
         AND stock_transactions.payment = 'credit'
         AND stock_transactions.created_at < $3
         AND ($4::text IS NULL OR branches.name = $4)
         AND ${shopScope()}
         AND ${openBalance} > 0
         ${pinParams}
       GROUP BY branches.name, customers.id, customers.name`,
      params
    );

    const youOwe = await client.query(
      `SELECT branches.name AS shop,
              suppliers.id AS party_id,
              suppliers.name AS party,
              COUNT(*)::bigint AS invoices,
              COALESCE(SUM${openBalance}, 0)::bigint AS cents
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.destination_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
         AND memberships.user_id = $1
       JOIN suppliers ON suppliers.id = stock_transactions.supplier_id
       WHERE stock_transactions.type = 'IN'
         AND stock_transactions.payment = 'credit'
         AND stock_transactions.created_at < $3
         AND ($4::text IS NULL OR branches.name = $4)
         AND ${shopScope()}
         AND ${openBalance} > 0
         ${pinParams}
       GROUP BY branches.name, suppliers.id, suppliers.name`,
      params
    );

    await client.query('COMMIT');

    const days = new Map(eachDay(filters.from, filters.to, filters.timeZone).map((date) => [date, emptyDay(date)]));
    const sales = { count: 0, units: 0, cents: 0, cashCents: 0, transferCents: 0, creditCents: 0 };
    const purchases = { count: 0, units: 0, cents: 0, cashCents: 0, transferCents: 0, creditCents: 0 };
    const money = {
      cashInCents: 0,
      cashOutCents: 0,
      bankInCents: 0,
      bankOutCents: 0,
      counterInCents: 0,
      counterOutCents: 0,
      creditCollectedInCents: 0,
      creditPaidOutCents: 0,
    };

    for (const row of booked.rows) {
      const day = days.get(row.day) || emptyDay(row.day);
      days.set(row.day, day);
      const billed = num(row.billed);
      const target = row.type === 'OUT' ? sales : purchases;
      target.count += num(row.count);
      target.units += num(row.units);
      target.cents += billed;
      target.cashCents += num(row.billed_cash);
      target.transferCents += num(row.billed_transfer);
      target.creditCents += num(row.billed_credit);
      if (row.type === 'OUT') {
        day.salesCents += billed;
        day.cashInCents += num(row.cash_paid);
        day.bankInCents += num(row.bank_paid);
        money.cashInCents += num(row.cash_paid);
        money.bankInCents += num(row.bank_paid);
        money.counterInCents += num(row.counter_paid);
      } else {
        day.purchasesCents += billed;
        day.cashOutCents += num(row.cash_paid);
        day.bankOutCents += num(row.bank_paid);
        money.cashOutCents += num(row.cash_paid);
        money.bankOutCents += num(row.bank_paid);
        money.counterOutCents += num(row.counter_paid);
      }
    }

    for (const row of collections.rows) {
      const day = days.get(row.day) || emptyDay(row.day);
      days.set(row.day, day);
      const cash = num(row.cash_cents);
      const bank = num(row.bank_cents);
      if (row.type === 'OUT') {
        day.cashInCents += cash;
        day.bankInCents += bank;
        money.cashInCents += cash;
        money.bankInCents += bank;
        money.creditCollectedInCents += cash + bank;
      } else {
        day.cashOutCents += cash;
        day.bankOutCents += bank;
        money.cashOutCents += cash;
        money.bankOutCents += bank;
        money.creditPaidOutCents += cash + bank;
      }
    }

    const shops = new Map(shopList.rows.map((row) => [row.name, {
      name: row.name,
      salesCents: 0,
      purchasesCents: 0,
      receivableCents: 0,
      payableCents: 0,
    }]));
    for (const row of byShop.rows) {
      const shop = shops.get(row.shop) || {
        name: row.shop,
        salesCents: 0,
        purchasesCents: 0,
        receivableCents: 0,
        payableCents: 0,
      };
      if (row.type === 'OUT') shop.salesCents += num(row.cents);
      else shop.purchasesCents += num(row.cents);
      shops.set(row.shop, shop);
    }

    const receivableByParty = new Map();
    let receivableCents = 0;
    let receivableInvoices = 0;
    for (const row of owedToYou.rows) {
      const cents = num(row.cents);
      const invoices = num(row.invoices);
      receivableCents += cents;
      receivableInvoices += invoices;
      const shop = shops.get(row.shop) || {
        name: row.shop,
        salesCents: 0,
        purchasesCents: 0,
        receivableCents: 0,
        payableCents: 0,
      };
      shop.receivableCents += cents;
      shops.set(row.shop, shop);
      const party = receivableByParty.get(row.party_id) || { name: row.party, cents: 0, invoices: 0 };
      party.cents += cents;
      party.invoices += invoices;
      receivableByParty.set(row.party_id, party);
    }

    const payableByParty = new Map();
    let payableCents = 0;
    let payableInvoices = 0;
    for (const row of youOwe.rows) {
      const cents = num(row.cents);
      const invoices = num(row.invoices);
      payableCents += cents;
      payableInvoices += invoices;
      const shop = shops.get(row.shop) || {
        name: row.shop,
        salesCents: 0,
        purchasesCents: 0,
        receivableCents: 0,
        payableCents: 0,
      };
      shop.payableCents += cents;
      shops.set(row.shop, shop);
      const party = payableByParty.get(row.party_id) || { name: row.party, cents: 0, invoices: 0 };
      party.cents += cents;
      party.invoices += invoices;
      payableByParty.set(row.party_id, party);
    }

    const ranked = (map) => [...map.values()].sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name));

    res.json({
      from: filters.from,
      to: filters.to,
      shop: filters.shop,
      bank: filters.bank,
      banks: banks.rows.map((row) => row.name),
      sales,
      purchases,
      money,
      receivableCents,
      receivableInvoices,
      payableCents,
      payableInvoices,
      days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      shops: [...shops.values()].sort((a, b) => a.name.localeCompare(b.name)),
      bankFlows: bankFlows.rows.map((row) => ({
        bank: row.bank,
        inCents: num(row.in_cents),
        outCents: num(row.out_cents),
      })),
      owedToYou: ranked(receivableByParty).slice(0, 20),
      youOwe: ranked(payableByParty).slice(0, 20),
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The transaction is already closed when the response was sent.
    }
    if (res.headersSent) {
      console.error(error);
      return;
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
