import { Router } from 'express';
import { getDb } from '../db.js';
const router = Router();
router.get('/', async (req, res) => {
    const userId = req.cookies.userId;
    if(!userId){
        return res.status(401).json({error:'login required'});
    }
    const db = await getDb();
    const products=await db.query(
        `select products.id, products.sku, products.name, products.unit_price, units.code as unit
        from products
        JOIN memberships ON memberships.organization_id = products.organization_id
        JOIN units ON units.id = products.unit_id
        WHERE memberships.user_id = $1`,
        [userId]
    )
    return res.json(products.rows);
});
router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Login required' });
  }

  const { sku, name, unit_price, unit } = req.body;
  if (!sku || !name || !unit) {
    return res.status(400).json({ error: 'sku, name, and unit are required' });
  }

  let cents = null;
  if (unit_price !== undefined && unit_price !== null && String(unit_price).trim() !== '') {
    const raw = String(unit_price).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      return res.status(400).json({ error: 'unit_price must be a price like 93.78' });
    }
    cents = Math.round(Number(raw) * 100);
  }

  try {
    const db = await getDb();
    const membership = await db.query(
      `SELECT organization_id FROM memberships WHERE user_id = $1`,
      [userId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of any organization' });
    }

    const organizationId = membership.rows[0].organization_id;
    const unitRow = await db.query(`SELECT id FROM units WHERE code = $1`, [unit]);
    if (unitRow.rows.length === 0) {
      return res.status(400).json({ error: 'Choose a unit from the list' });
    }

    const product = await db.query(
      `INSERT INTO products (sku, name, unit_price, organization_id, unit_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sku, name, unit_price, organization_id`,
      [sku, name, cents, organizationId, unitRow.rows[0].id]
    );
    return res.status(201).json(product.rows[0]);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'products_sku_key') {
      return res.status(409).json({ error: 'SKU is already used' });
    }
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
      const sku = String(item.sku || '').trim();
      const name = String(item.name || '').trim();
      const unit = String(item.unit || '').trim();
      const price = String(item.price ?? '').trim();
      if (!sku || !name || !unit) {
        errors.push({ row, message: 'SKU, name, and unit are required' });
        continue;
      }
      let cents = null;
      if (price !== '') {
        if (!/^\d+(\.\d{1,2})?$/.test(price)) {
          errors.push({ row, message: 'Price must look like 45.34, or be left empty' });
          continue;
        }
        cents = Math.round(Number(price) * 100);
      }
      const unitRow = await client.query(`SELECT id FROM units WHERE code = $1`, [unit]);
      if (unitRow.rows.length === 0) {
        errors.push({ row, message: 'Choose a unit from the list' });
        continue;
      }
      ready.push({ row, sku, name, cents, unitId: unitRow.rows[0].id });
    }
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fix the rows and try again', errors });
    }
    for (const item of ready) {
      try {
        await client.query(
          `INSERT INTO products (sku, name, unit_price, organization_id, unit_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.sku, item.name, item.cents, organizationId, item.unitId]
        );
      } catch (error) {
        if (error.code === '23505' && error.constraint === 'products_sku_key') {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'SKU is already used',
            errors: [{ row: item.row, message: 'SKU is already used' }],
          });
        }
        throw error;
      }
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