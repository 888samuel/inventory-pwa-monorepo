import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });

  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT customers.id, customers.name, customers.tin, customers.is_walking
       FROM customers
       JOIN memberships ON memberships.organization_id = customers.organization_id
       WHERE memberships.user_id = $1
       ORDER BY customers.is_walking DESC, customers.name`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });

  const name = req.body?.name?.trim();
  const tin = req.body?.tin?.trim();
  if (!name || !tin) {
    return res.status(400).json({ error: 'TIN and organization name are required' });
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

    const customer = await db.query(
      `INSERT INTO customers (organization_id, name, tin)
       VALUES ($1, $2, $3)
       RETURNING id, name, tin, is_walking`,
      [membership.rows[0].organization_id, name, tin]
    );
    return res.status(201).json(customer.rows[0]);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'idx_customers_tin') {
      return res.status(409).json({ error: 'TIN is already used' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
router.patch('/:id', async (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: 'Login required' });
  
    const name = req.body?.name?.trim();
    const tin = req.body?.tin?.trim();
    if (!name || !tin) {
      return res.status(400).json({ error: 'TIN and organization name are required' });
    }
  
    try {
      const db = await getDb();
      const found = await db.query(
        `SELECT customers.id, customers.is_walking
         FROM customers
         JOIN memberships ON memberships.organization_id = customers.organization_id
         WHERE customers.id = $1 AND memberships.user_id = $2`,
        [req.params.id, userId]
      );
      if (found.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      if (found.rows[0].is_walking) {
        return res.status(400).json({ error: 'The walking customer stays as it is' });
      }
  
      const customer = await db.query(
        `UPDATE customers
         SET name = $1, tin = $2
         WHERE id = $3
         RETURNING id, name, tin, is_walking`,
        [name, tin, req.params.id]
      );
      res.json(customer.rows[0]);
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'idx_customers_tin') {
        return res.status(409).json({ error: 'TIN is already used' });
      }
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  router.delete('/:id', async (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: 'Login required' });
  
    try {
      const db = await getDb();
      const found = await db.query(
        `SELECT customers.id, customers.is_walking
         FROM customers
         JOIN memberships ON memberships.organization_id = customers.organization_id
         WHERE customers.id = $1 AND memberships.user_id = $2`,
        [req.params.id, userId]
      );
      if (found.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      if (found.rows[0].is_walking) {
        return res.status(400).json({ error: 'The walking customer stays as it is' });
      }
  
      await db.query(`DELETE FROM customers WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
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
      const tin = String(item.tin || '').trim();
      const name = String(item.name || '').trim();
      if (!tin || !name) {
        errors.push({ row, message: 'TIN and organization name are required' });
        continue;
      }
      ready.push({ row, tin, name });
    }
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fix the rows and try again', errors });
    }
    for (const item of ready) {
      try {
        await client.query(
          `INSERT INTO customers (organization_id, name, tin) VALUES ($1, $2, $3)`,
          [organizationId, item.name, item.tin]
        );
      } catch (error) {
        if (error.code === '23505' && error.constraint === 'idx_customers_tin') {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'TIN is already used',
            errors: [{ row: item.row, message: 'TIN is already used' }],
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