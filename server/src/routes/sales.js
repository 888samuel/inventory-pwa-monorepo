import { Router } from 'express';
import { getDb } from '../db.js';
import { shopScope } from '../shopScope.js';
import { canonicalBank, priceModeFor, pricedCents } from '../orgSettings.js';

const router = Router();

router.get('/next', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const shop = String(req.query.shop || '').trim();
  if (!shop) return res.status(400).json({ error: 'shop is required' });
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT COALESCE(shop_invoice_counters.last_number, 0) + 1 AS invoice_number
       FROM branches
       JOIN memberships ON memberships.organization_id = branches.organization_id
       LEFT JOIN shop_invoice_counters ON shop_invoice_counters.branch_id = branches.id
       WHERE branches.name = $1 AND memberships.user_id = $2
         AND ${shopScope()}`,
      [shop, userId]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Choose a shop' });
    res.json({ invoiceNumber: result.rows[0].invoice_number });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Login required' });
  }

  const from = req.query.from;
  const to = req.query.to;
  const shop = req.query.shop || null;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  try {
    const db = await getDb();
    const where = `memberships.user_id = $1
         AND ${shopScope()}
         AND stock_transactions.type = 'OUT'
         AND stock_transactions.created_at >= $2
         AND stock_transactions.created_at < $3
         AND ($4::text IS NULL OR branches.name = $4)`;
    const params = [userId, from, to, shop];
    const [productsResult, shopsResult] = await Promise.all([
      db.query(
        `SELECT products.name AS label,
                COUNT(*)::int AS invoices,
                SUM(stock_transactions.quantity)::int AS units,
                SUM(stock_transactions.quantity * stock_transactions.unit_price)::int AS cents
         FROM stock_transactions
         JOIN products ON products.id = stock_transactions.product_id
         JOIN branches ON branches.id = stock_transactions.source_branch_id
         JOIN memberships ON memberships.organization_id = branches.organization_id
         WHERE ${where}
         GROUP BY products.name
         ORDER BY cents DESC`,
        params,
      ),
      db.query(
        `SELECT branches.name AS name,
                COUNT(*)::int AS invoices,
                SUM(stock_transactions.quantity)::int AS units,
                SUM(stock_transactions.quantity * stock_transactions.unit_price)::int AS cents
         FROM stock_transactions
         JOIN branches ON branches.id = stock_transactions.source_branch_id
         JOIN memberships ON memberships.organization_id = branches.organization_id
         WHERE ${where}
         GROUP BY branches.name
         ORDER BY cents DESC`,
        params,
      ),
    ]);

    const bars = productsResult.rows;
    const units = bars.reduce((sum, bar) => sum + bar.units, 0);
    const cents = bars.reduce((sum, bar) => sum + bar.cents, 0);
    const invoices = bars.reduce((sum, bar) => sum + bar.invoices, 0);
    res.json({ units, cents, invoices, bars, shops: shopsResult.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });

  const shop = req.body?.shop?.trim();
  const customerId = Number(req.body?.customerId);
  const productId = Number(req.body?.productId);
  const unit = req.body?.unit?.trim();
  const quantity = Number(req.body?.quantity);
  const payment = req.body?.payment;

  if (!shop || !customerId || !productId || !unit || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Shop, customer, product, unit, and quantity are required' });
  }
  if (payment !== 'cash' && payment !== 'transfer' && payment !== 'credit') {
    return res.status(400).json({ error: 'Payment must be cash, transfer, or credit' });
  }
  let bankName = payment === 'transfer' ? String(req.body?.bankName || '').trim() : null;
  if (payment === 'transfer' && !bankName) {
    return res.status(400).json({ error: 'Choose a bank' });
  }

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await client.query(
      `SELECT organization_id FROM memberships WHERE user_id = $1`,
      [userId]
    );
    if (membership.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of any organization' });
    }
    const organizationId = membership.rows[0].organization_id;

    const branch = await client.query(
      `SELECT branches.id
       FROM branches
       JOIN memberships ON memberships.organization_id = branches.organization_id
       WHERE branches.name = $1
         AND memberships.user_id = $2
         AND branches.organization_id = $3
         AND ${shopScope()}`,
      [shop, userId, organizationId]
    );
    if (branch.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a shop' });
    }

    const customer = await client.query(
      `SELECT id, is_walking FROM customers WHERE id = $1 AND organization_id = $2`,
      [customerId, organizationId]
    );
    if (customer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a customer' });
    }
    if (payment === 'credit' && customer.rows[0].is_walking) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A walking customer cannot buy on credit' });
    }

    const product = await client.query(
      `SELECT products.id, products.name, products.unit_price, units.id AS unit_id, units.code
       FROM products
       JOIN units ON units.id = products.unit_id
       WHERE products.id = $1 AND products.organization_id = $2`,
      [productId, organizationId]
    );
    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a product' });
    }
    if (product.rows[0].code !== unit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `This product is sold in ${product.rows[0].code}` });
    }

    const priceMode = await priceModeFor(client, organizationId);
    const priced = pricedCents(priceMode, product.rows[0].unit_price, req.body?.unitPrice);
    if (priced.error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: priced.error });
    }
    const cents = priced.cents;
    if (payment === 'transfer') {
      const bank = await canonicalBank(client, organizationId, bankName);
      if (bank.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: bank.error });
      }
      bankName = bank.name;
    }

    const totalCents = cents * quantity;
    let creditKind = null;
    let paidCents = totalCents;
    if (payment === 'credit') {
      creditKind = req.body?.creditKind;
      if (creditKind === 'full') {
        paidCents = 0;
      } else if (creditKind === 'partial') {
        const raw = String(req.body?.paidNow ?? '').trim();
        if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Enter how much is paid now, like 10.00' });
        }
        paidCents = Math.round(Number(raw) * 100);
        if (paidCents <= 0 || paidCents >= totalCents) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Paid now must be more than 0 and less than the total' });
        }
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Choose full or partial credit' });
      }
    }

    const counter = await client.query(
      `INSERT INTO shop_invoice_counters (branch_id, last_number)
       VALUES ($1, 1)
       ON CONFLICT (branch_id)
       DO UPDATE SET last_number = shop_invoice_counters.last_number + 1
       RETURNING last_number`,
      [branch.rows[0].id]
    );
    const invoiceNumber = counter.rows[0].last_number;

    const stock = await client.query(
      `SELECT stock_quantity FROM branch_inventory
       WHERE branch_id = $1 AND product_id = $2
       FOR UPDATE`,
      [branch.rows[0].id, productId]
    );
    const onHand = stock.rows[0]?.stock_quantity ?? 0;
    if (onHand < quantity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only ${onHand} left in this shop` });
    }

    await client.query(
      `UPDATE branch_inventory
       SET stock_quantity = stock_quantity - $1, updated_at = now()
       WHERE branch_id = $2 AND product_id = $3`,
      [quantity, branch.rows[0].id, productId]
    );
    const sale = await client.query(
      `INSERT INTO stock_transactions
         (source_branch_id, product_id, quantity, type, customer_id, payment, unit_id, unit_price, invoice_number, credit_kind, paid_cents, bank_name, created_by)
       VALUES ($1, $2, $3, 'OUT', $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [branch.rows[0].id, productId, quantity, customerId, payment, product.rows[0].unit_id, cents, invoiceNumber, creditKind, paidCents, bankName, userId]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      id: sale.rows[0].id,
      name: product.rows[0].name,
      quantity,
      unit,
      payment,
      bankName,
      creditKind,
      invoiceNumber,
      paidCents,
      balanceCents: totalCents - paidCents,
      onHand: onHand - quantity,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.get('/completed', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const shopRaw = String(req.query.shop || '').trim();
  const shop = !shopRaw || shopRaw === 'all' ? null : shopRaw;
  const invoiceRaw = String(req.query.invoice || '').trim();
  let invoice = null;
  if (invoiceRaw) {
    if (!/^\d+$/.test(invoiceRaw)) {
      return res.status(400).json({ error: 'Invoice number must be a whole number' });
    }
    invoice = Number(invoiceRaw);
  }
  const dateRaw = String(req.query.date || '').trim();
  if (dateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return res.status(400).json({ error: 'Choose a date' });
  }
  const timeZone = String(req.query.timeZone || 'UTC').trim();
  if (!/^[A-Za-z0-9_+/-]{1,64}$/.test(timeZone)) {
    return res.status(400).json({ error: 'Choose a time zone' });
  }
  try {
    const db = await getDb();
    try {
      await db.query(`SELECT now() AT TIME ZONE $1`, [timeZone]);
    } catch (error) {
      if (error.code === '22023') return res.status(400).json({ error: 'Choose a time zone' });
      throw error;
    }
    const result = await db.query(
      `SELECT stock_transactions.id,
              stock_transactions.invoice_number,
              stock_transactions.created_at,
              stock_transactions.payment,
              stock_transactions.bank_name,
              branches.name AS shop,
              customers.name AS customer,
              products.name AS product,
              units.code AS unit,
              stock_transactions.quantity,
              (stock_transactions.unit_price * stock_transactions.quantity)::int AS total_cents,
              stock_transactions.paid_cents,
              COALESCE(SUM(credit_payments.amount_cents), 0)::int AS collected_cents,
              actors.name AS created_by_name
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.source_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
       JOIN customers ON customers.id = stock_transactions.customer_id
       JOIN products ON products.id = stock_transactions.product_id
       JOIN units ON units.id = stock_transactions.unit_id
       LEFT JOIN users actors ON actors.id = stock_transactions.created_by
       LEFT JOIN credit_payments ON credit_payments.sale_id = stock_transactions.id
       WHERE memberships.user_id = $1
         AND ${shopScope()}
         AND stock_transactions.type = 'OUT'
         AND ($2::text IS NULL OR branches.name = $2)
         AND ($3::int IS NULL OR stock_transactions.invoice_number = $3)
         AND (
           $4::date IS NULL
           OR (stock_transactions.created_at AT TIME ZONE $5)::date = $4::date
         )
       GROUP BY stock_transactions.id, branches.name, customers.name, products.name, units.code, actors.name
       ORDER BY stock_transactions.created_at DESC, stock_transactions.invoice_number DESC
       LIMIT 200`,
      [userId, shop, invoice, dateRaw || null, timeZone]
    );
    res.json(result.rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      soldAt: row.created_at,
      shop: row.shop,
      customer: row.customer,
      product: row.product,
      quantity: row.quantity,
      unit: row.unit,
      payment: row.payment,
      bankName: row.bank_name,
      totalCents: row.total_cents,
      paidCents: row.paid_cents + row.collected_cents,
      balanceCents: row.total_cents - row.paid_cents - row.collected_cents,
      createdBy: row.created_by_name,
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/credit', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const shop = String(req.query.shop || '').trim();
  if (!shop) return res.status(400).json({ error: 'Choose a shop' });
  const invoiceRaw = String(req.query.invoice || '').trim();
  let invoice = null;
  if (invoiceRaw) {
    if (!/^\d+$/.test(invoiceRaw)) {
      return res.status(400).json({ error: 'Invoice number must be a whole number' });
    }
    invoice = Number(invoiceRaw);
  }
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT stock_transactions.id,
              stock_transactions.invoice_number,
              branches.name AS shop,
              customers.name AS customer,
              products.name AS product,
              units.code AS unit,
              stock_transactions.quantity,
              (stock_transactions.unit_price * stock_transactions.quantity)::int AS total_cents,
              stock_transactions.paid_cents,
              COALESCE(SUM(credit_payments.amount_cents), 0)::int AS collected_cents,
              COALESCE(
                json_agg(
                  json_build_object(
                    'amountCents', credit_payments.amount_cents,
                    'payment', credit_payments.payment,
                    'bankName', credit_payments.bank_name
                  )
                  ORDER BY credit_payments.id
                ) FILTER (WHERE credit_payments.id IS NOT NULL),
                '[]'
              ) AS payments,
              actors.name AS created_by_name
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.source_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
       JOIN customers ON customers.id = stock_transactions.customer_id
       JOIN products ON products.id = stock_transactions.product_id
       JOIN units ON units.id = stock_transactions.unit_id
       LEFT JOIN users actors ON actors.id = stock_transactions.created_by
       LEFT JOIN credit_payments ON credit_payments.sale_id = stock_transactions.id
       WHERE memberships.user_id = $1
         AND ${shopScope()}
         AND stock_transactions.type = 'OUT'
         AND stock_transactions.payment = 'credit'
         AND branches.name = $2
         AND ($3::int IS NULL OR stock_transactions.invoice_number = $3)
       GROUP BY stock_transactions.id, branches.name, customers.name, products.name, units.code, actors.name
       HAVING (
         $3::int IS NOT NULL
         OR stock_transactions.paid_cents + COALESCE(SUM(credit_payments.amount_cents), 0)
            < stock_transactions.unit_price * stock_transactions.quantity
       )
       ORDER BY stock_transactions.invoice_number`,
      [userId, shop, invoice]
    );
    res.json(result.rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      shop: row.shop,
      customer: row.customer,
      product: row.product,
      quantity: row.quantity,
      unit: row.unit,
      totalCents: row.total_cents,
      paidCents: row.paid_cents + row.collected_cents,
      balanceCents: row.total_cents - row.paid_cents - row.collected_cents,
      payments: row.payments,
      createdBy: row.created_by_name,
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/credit', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const saleId = Number(req.body?.saleId);
  const payment = req.body?.payment;
  const raw = String(req.body?.amount ?? '').trim();
  if (!Number.isInteger(saleId) || saleId < 1) {
    return res.status(400).json({ error: 'Choose an invoice' });
  }
  if (payment !== 'cash' && payment !== 'transfer') {
    return res.status(400).json({ error: 'Payment must be cash or transfer' });
  }
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return res.status(400).json({ error: 'Enter the amount paid, like 10.00' });
  }
  const amountCents = Math.round(Number(raw) * 100);
  if (amountCents <= 0) {
    return res.status(400).json({ error: 'Enter the amount paid, like 10.00' });
  }
  let bankName = payment === 'transfer' ? String(req.body?.bankName || '').trim() : null;
  if (payment === 'transfer' && !bankName) {
    return res.status(400).json({ error: 'Choose a bank' });
  }

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const sale = await client.query(
      `SELECT stock_transactions.id,
              stock_transactions.invoice_number,
              stock_transactions.payment,
              stock_transactions.paid_cents,
              memberships.organization_id,
              (stock_transactions.unit_price * stock_transactions.quantity)::int AS total_cents
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.source_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
       WHERE stock_transactions.id = $1
         AND stock_transactions.type = 'OUT'
         AND memberships.user_id = $2
         AND ${shopScope()}
       FOR UPDATE OF stock_transactions`,
      [saleId, userId]
    );
    if (sale.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found in your shops' });
    }
    if (sale.rows[0].payment !== 'credit') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This invoice is not on credit' });
    }
    if (payment === 'transfer') {
      const bank = await canonicalBank(client, sale.rows[0].organization_id, bankName);
      if (bank.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: bank.error });
      }
      bankName = bank.name;
    }
    const collected = await client.query(
      `SELECT COALESCE(SUM(amount_cents), 0)::int AS cents FROM credit_payments WHERE sale_id = $1`,
      [saleId]
    );
    const balance = sale.rows[0].total_cents - sale.rows[0].paid_cents - collected.rows[0].cents;
    if (amountCents > balance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Only ${(balance / 100).toFixed(2)} is still on credit` });
    }
    await client.query(
      `INSERT INTO credit_payments (sale_id, amount_cents, payment, bank_name)
       VALUES ($1, $2, $3, $4)`,
      [saleId, amountCents, payment, bankName]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      invoiceNumber: sale.rows[0].invoice_number,
      payment,
      bankName,
      paidCents: amountCents,
      balanceCents: balance - amountCents,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;