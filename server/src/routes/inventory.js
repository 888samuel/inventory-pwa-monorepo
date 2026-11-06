import { Router } from 'express';
import { getDb } from '../db.js';
import { shopScope } from '../shopScope.js';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });

  const shop = req.query.shop || null;
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT products.id,
              products.sku,
              products.name,
              units.code AS unit,
              COALESCE(SUM(branch_inventory.stock_quantity), 0)::int AS quantity
       FROM products
       JOIN units ON units.id = products.unit_id
       JOIN memberships ON memberships.organization_id = products.organization_id
       LEFT JOIN branches
         ON branches.organization_id = products.organization_id
        AND ($2::text IS NULL OR branches.name = $2)
        AND ${shopScope()}
       LEFT JOIN branch_inventory
         ON branch_inventory.product_id = products.id
        AND branch_inventory.branch_id = branches.id
       WHERE memberships.user_id = $1
       GROUP BY products.id, products.sku, products.name, units.code
       ORDER BY products.name`,
      [userId, shop]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/import', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows || rows.length === 0) return res.status(400).json({ error: 'The file has no rows to save' });
  if (rows.length > 500) return res.status(400).json({ error: 'Only 500 rows can be imported at once' });

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
    const errors = [];
    const ready = [];
    for (const item of rows) {
      const row = Number(item.row) || 0;
      const shop = String(item.shop || '').trim();
      const sku = String(item.sku || '').trim();
      const quantity = Number(item.quantity);
      if (!shop || !sku || !Number.isInteger(quantity) || quantity < 0) {
        errors.push({ row, message: 'Shop, SKU, and a whole quantity are required' });
        continue;
      }
      const branch = await client.query(
        `SELECT branches.id
         FROM branches
         JOIN memberships ON memberships.organization_id = branches.organization_id
         WHERE branches.name = $1
           AND memberships.user_id = $2
           AND memberships.organization_id = $3
           AND ${shopScope()}`,
        [shop, userId, organizationId]
      );
      if (branch.rows.length === 0) {
        errors.push({ row, message: 'That shop is not in your list' });
        continue;
      }
      const product = await client.query(
        `SELECT id FROM products WHERE sku = $1 AND organization_id = $2`,
        [sku, organizationId]
      );
      if (product.rows.length === 0) {
        errors.push({ row, message: 'No product with that SKU' });
        continue;
      }
      ready.push({
        branchId: branch.rows[0].id,
        productId: product.rows[0].id,
        quantity,
      });
    }
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fix the rows and try again', errors });
    }
    for (const item of ready) {
      await client.query(
        `INSERT INTO branch_inventory (branch_id, product_id, stock_quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (branch_id, product_id)
         DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity, updated_at = now()`,
        [item.branchId, item.productId, item.quantity]
      );
    }
    await client.query('COMMIT');
    return res.status(201).json({ saved: ready.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;