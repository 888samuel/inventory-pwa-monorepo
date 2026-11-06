import { Router } from 'express';
import { getDb } from '../db.js';
import { shopScope } from '../shopScope.js';
import { hasPermission, membershipFor } from '../permissions.js';

const router = Router();

function orderSelect() {
  return `SELECT transfer_orders.id,
            source.name AS from_shop,
            destination.name AS to_shop,
            products.name AS product,
            units.code AS unit,
            transfer_orders.quantity,
            transfer_orders.status,
            transfer_orders.ordered_at
     FROM transfer_orders
     JOIN branches source ON source.id = transfer_orders.source_branch_id
     JOIN branches destination ON destination.id = transfer_orders.destination_branch_id
     JOIN products ON products.id = transfer_orders.product_id
     JOIN units ON units.id = transfer_orders.unit_id`;
}

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  try {
    const db = await getDb();
    const membership = await membershipFor(db, userId);
    if (!membership) return res.status(403).json({ error: 'You are not a member of any organization' });
    const canOrder = await hasPermission(db, membership, 'transfer.order');
    const canConfirm = await hasPermission(db, membership, 'transfer.confirm');
    const shops = await db.query(
      `SELECT branches.name
       FROM branches
       WHERE branches.organization_id = $1
       ORDER BY branches.name`,
      [membership.organization_id]
    );
    const incoming = canConfirm
      ? await db.query(
        `${orderSelect()}
         JOIN memberships ON memberships.id = $1
         WHERE transfer_orders.organization_id = $2
           AND transfer_orders.status = 'ordered'
           AND ${shopScope('destination')}
         ORDER BY transfer_orders.ordered_at`,
        [membership.id, membership.organization_id]
      )
      : { rows: [] };
    const outgoing = await db.query(
      `${orderSelect()}
       JOIN memberships ON memberships.id = $1
       WHERE transfer_orders.organization_id = $2
         AND transfer_orders.status = 'ordered'
         AND ${shopScope('source')}
       ORDER BY transfer_orders.ordered_at`,
      [membership.id, membership.organization_id]
    );
    res.json({
      canOrder,
      canConfirm,
      shops: shops.rows,
      incoming: incoming.rows,
      outgoing: outgoing.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const fromShop = String(req.body?.fromShop || '').trim();
  const toShop = String(req.body?.toShop || '').trim();
  const productId = Number(req.body?.productId);
  const unit = String(req.body?.unit || '').trim();
  const quantity = Number(req.body?.quantity);
  if (!fromShop || !toShop) return res.status(400).json({ error: 'Choose the shop to send from and the shop to receive' });
  if (fromShop === toShop) return res.status(400).json({ error: 'Choose two different shops' });
  if (!Number.isInteger(productId) || productId < 1) return res.status(400).json({ error: 'Choose a product' });
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Quantity must be a whole number' });

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of any organization' });
    }
    if (!await hasPermission(client, membership, 'transfer.order')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot order a transfer' });
    }
    const source = await client.query(
      `SELECT branches.id
       FROM branches
       JOIN memberships ON memberships.organization_id = branches.organization_id
       WHERE branches.name = $1
         AND memberships.user_id = $2
         AND memberships.organization_id = $3
         AND ${shopScope()}`,
      [fromShop, userId, membership.organization_id]
    );
    if (source.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a shop you can send from' });
    }
    const destination = await client.query(
      `SELECT id FROM branches WHERE name = $1 AND organization_id = $2`,
      [toShop, membership.organization_id]
    );
    if (destination.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a shop in this company' });
    }
    const product = await client.query(
      `SELECT products.id, products.name, units.id AS unit_id, units.code
       FROM products
       JOIN units ON units.id = products.unit_id
       WHERE products.id = $1 AND products.organization_id = $2`,
      [productId, membership.organization_id]
    );
    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a product' });
    }
    if (product.rows[0].code !== unit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `This product is counted in ${product.rows[0].code}` });
    }
    const stock = await client.query(
      `SELECT stock_quantity FROM branch_inventory
       WHERE branch_id = $1 AND product_id = $2`,
      [source.rows[0].id, productId]
    );
    const onHand = stock.rows[0]?.stock_quantity ?? 0;
    if (onHand < quantity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only ${onHand} left in ${fromShop}` });
    }
    const order = await client.query(
      `INSERT INTO transfer_orders
         (organization_id, source_branch_id, destination_branch_id, product_id, unit_id, quantity, status, ordered_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'ordered', $7)
       RETURNING id`,
      [membership.organization_id, source.rows[0].id, destination.rows[0].id, productId, product.rows[0].unit_id, quantity, userId]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      id: order.rows[0].id,
      fromShop,
      toShop,
      name: product.rows[0].name,
      quantity,
      unit,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.post('/:id/accept', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const transferId = Number(req.params.id);
  if (!Number.isInteger(transferId) || transferId < 1) {
    return res.status(400).json({ error: 'Choose a transfer' });
  }

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of any organization' });
    }
    if (!await hasPermission(client, membership, 'transfer.confirm')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot confirm a transfer' });
    }
    const order = await client.query(
      `SELECT transfer_orders.id,
              transfer_orders.source_branch_id,
              transfer_orders.destination_branch_id,
              transfer_orders.product_id,
              transfer_orders.unit_id,
              transfer_orders.quantity,
              transfer_orders.status,
              source.name AS from_shop,
              destination.name AS to_shop,
              products.name,
              units.code AS unit
       FROM transfer_orders
       JOIN branches source ON source.id = transfer_orders.source_branch_id
       JOIN branches destination ON destination.id = transfer_orders.destination_branch_id
       JOIN products ON products.id = transfer_orders.product_id
       JOIN units ON units.id = transfer_orders.unit_id
       JOIN memberships ON memberships.id = $2
       WHERE transfer_orders.id = $1
         AND transfer_orders.organization_id = $3
         AND ${shopScope('destination')}
       FOR UPDATE OF transfer_orders`,
      [transferId, membership.id, membership.organization_id]
    );
    if (order.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'That transfer is not waiting at a shop you can confirm' });
    }
    const row = order.rows[0];
    if (row.status !== 'ordered') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This transfer is already accepted' });
    }
    const stock = await client.query(
      `SELECT stock_quantity FROM branch_inventory
       WHERE branch_id = $1 AND product_id = $2
       FOR UPDATE`,
      [row.source_branch_id, row.product_id]
    );
    const onHand = stock.rows[0]?.stock_quantity ?? 0;
    if (onHand < row.quantity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only ${onHand} left in ${row.from_shop}` });
    }
    await client.query(
      `UPDATE branch_inventory
       SET stock_quantity = stock_quantity - $1, updated_at = now()
       WHERE branch_id = $2 AND product_id = $3`,
      [row.quantity, row.source_branch_id, row.product_id]
    );
    const destinationStock = await client.query(
      `INSERT INTO branch_inventory (branch_id, product_id, stock_quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (branch_id, product_id)
       DO UPDATE SET stock_quantity = branch_inventory.stock_quantity + EXCLUDED.stock_quantity, updated_at = now()
       RETURNING stock_quantity`,
      [row.destination_branch_id, row.product_id, row.quantity]
    );
    const movement = await client.query(
      `INSERT INTO stock_transactions
         (source_branch_id, destination_branch_id, product_id, quantity, type, unit_id)
       VALUES ($1, $2, $3, $4, 'TRANSFER', $5)
       RETURNING id`,
      [row.source_branch_id, row.destination_branch_id, row.product_id, row.quantity, row.unit_id]
    );
    await client.query(
      `UPDATE transfer_orders
       SET status = 'accepted', accepted_by = $1, accepted_at = now(), stock_transaction_id = $2
       WHERE id = $3`,
      [userId, movement.rows[0].id, row.id]
    );
    const sourceLeft = await client.query(
      `SELECT stock_quantity FROM branch_inventory WHERE branch_id = $1 AND product_id = $2`,
      [row.source_branch_id, row.product_id]
    );
    await client.query('COMMIT');
    return res.status(200).json({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      fromShop: row.from_shop,
      toShop: row.to_shop,
      sourceOnHand: sourceLeft.rows[0]?.stock_quantity ?? 0,
      destinationOnHand: destinationStock.rows[0].stock_quantity,
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
