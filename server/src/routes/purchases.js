import { Router } from 'express';
import { getDb } from '../db.js';
import { shopScope } from '../shopScope.js';

const router = Router();

router.get('/next', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const shop = String(req.query.shop || '').trim();
  if (!shop) return res.status(400).json({ error: 'shop is required' });
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT COALESCE(shop_purchase_counters.last_number, 0) + 1 AS invoice_number
       FROM branches
       JOIN memberships ON memberships.organization_id = branches.organization_id
       LEFT JOIN shop_purchase_counters ON shop_purchase_counters.branch_id = branches.id
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
              suppliers.name AS supplier,
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
              ) AS payments
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.destination_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
       JOIN suppliers ON suppliers.id = stock_transactions.supplier_id
       JOIN products ON products.id = stock_transactions.product_id
       JOIN units ON units.id = stock_transactions.unit_id
       LEFT JOIN credit_payments ON credit_payments.sale_id = stock_transactions.id
       WHERE memberships.user_id = $1
         AND ${shopScope()}
         AND stock_transactions.type = 'IN'
         AND stock_transactions.payment = 'credit'
         AND branches.name = $2
         AND ($3::int IS NULL OR stock_transactions.invoice_number = $3)
       GROUP BY stock_transactions.id, branches.name, suppliers.name, products.name, units.code
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
      supplier: row.supplier,
      product: row.product,
      quantity: row.quantity,
      unit: row.unit,
      totalCents: row.total_cents,
      paidCents: row.paid_cents + row.collected_cents,
      balanceCents: row.total_cents - row.paid_cents - row.collected_cents,
      payments: row.payments,
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/credit', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const purchaseId = Number(req.body?.purchaseId);
  const payment = req.body?.payment;
  const raw = String(req.body?.amount ?? '').trim();
  if (!Number.isInteger(purchaseId) || purchaseId < 1) {
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
  const bankName = payment === 'transfer' ? String(req.body?.bankName || '').trim() : null;
  if (payment === 'transfer' && !bankName) {
    return res.status(400).json({ error: 'Type the bank name' });
  }

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const purchase = await client.query(
      `SELECT stock_transactions.id,
              stock_transactions.invoice_number,
              stock_transactions.payment,
              stock_transactions.paid_cents,
              (stock_transactions.unit_price * stock_transactions.quantity)::int AS total_cents
       FROM stock_transactions
       JOIN branches ON branches.id = stock_transactions.destination_branch_id
       JOIN memberships ON memberships.organization_id = branches.organization_id
       WHERE stock_transactions.id = $1
         AND stock_transactions.type = 'IN'
         AND memberships.user_id = $2
         AND ${shopScope()}
       FOR UPDATE OF stock_transactions`,
      [purchaseId, userId]
    );
    if (purchase.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found in your shops' });
    }
    if (purchase.rows[0].payment !== 'credit') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This invoice is not on credit' });
    }
    const collected = await client.query(
      `SELECT COALESCE(SUM(amount_cents), 0)::int AS cents FROM credit_payments WHERE sale_id = $1`,
      [purchaseId]
    );
    const balance = purchase.rows[0].total_cents - purchase.rows[0].paid_cents - collected.rows[0].cents;
    if (amountCents > balance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Only ${(balance / 100).toFixed(2)} is still on credit` });
    }
    await client.query(
      `INSERT INTO credit_payments (sale_id, amount_cents, payment, bank_name)
       VALUES ($1, $2, $3, $4)`,
      [purchaseId, amountCents, payment, bankName]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      invoiceNumber: purchase.rows[0].invoice_number,
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

router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });

  const shop = req.body?.shop?.trim();
  const supplierId = Number(req.body?.supplierId);
  const productId = Number(req.body?.productId);
  const unit = req.body?.unit?.trim();
  const quantity = Number(req.body?.quantity);
  const payment = req.body?.payment;

  if (!shop || !supplierId || !productId || !unit || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Shop, supplier, product, unit, and quantity are required' });
  }
  if (payment !== 'cash' && payment !== 'transfer' && payment !== 'credit') {
    return res.status(400).json({ error: 'Payment must be cash, transfer, or credit' });
  }
  const bankName = payment === 'transfer' ? String(req.body?.bankName || '').trim() : null;
  if (payment === 'transfer' && !bankName) {
    return res.status(400).json({ error: 'Type the bank name' });
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

    const supplier = await client.query(
      `SELECT id FROM suppliers WHERE id = $1 AND organization_id = $2`,
      [supplierId, organizationId]
    );
    if (supplier.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a supplier' });
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
      return res.status(400).json({ error: `This product is bought in ${product.rows[0].code}` });
    }

    const rawPrice = String(req.body?.unitPrice ?? '').trim();
    let cents = product.rows[0].unit_price;
    if (rawPrice !== '') {
      if (!/^\d+(\.\d{1,2})?$/.test(rawPrice)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Enter a unit price like 45.34' });
      }
      cents = Math.round(Number(rawPrice) * 100);
    }
    if (cents == null) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Enter a unit price like 45.34' });
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
      `INSERT INTO shop_purchase_counters (branch_id, last_number)
       VALUES ($1, 1)
       ON CONFLICT (branch_id)
       DO UPDATE SET last_number = shop_purchase_counters.last_number + 1
       RETURNING last_number`,
      [branch.rows[0].id]
    );
    const invoiceNumber = counter.rows[0].last_number;

    const stock = await client.query(
      `INSERT INTO branch_inventory (branch_id, product_id, stock_quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (branch_id, product_id)
       DO UPDATE SET stock_quantity = branch_inventory.stock_quantity + EXCLUDED.stock_quantity, updated_at = now()
       RETURNING stock_quantity`,
      [branch.rows[0].id, productId, quantity]
    );

    const purchase = await client.query(
      `INSERT INTO stock_transactions
         (destination_branch_id, product_id, quantity, type, supplier_id, payment, unit_id, unit_price, invoice_number, credit_kind, paid_cents, bank_name)
       VALUES ($1, $2, $3, 'IN', $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [branch.rows[0].id, productId, quantity, supplierId, payment, product.rows[0].unit_id, cents, invoiceNumber, creditKind, paidCents, bankName]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      id: purchase.rows[0].id,
      name: product.rows[0].name,
      quantity,
      unit,
      payment,
      bankName,
      creditKind,
      invoiceNumber,
      paidCents,
      balanceCents: totalCents - paidCents,
      onHand: stock.rows[0].stock_quantity,
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
