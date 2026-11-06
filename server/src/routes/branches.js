import { Router } from 'express';
import { getDb } from '../db.js';
import { shopScope } from '../shopScope.js';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  try {
    const db = await getDb();
    const branche=await db.query(
      `SELECT branches.id, branches.name, branches.location
      FROM branches
      JOIN memberships ON memberships.user_id = $1
      WHERE branches.organization_id = memberships.organization_id
        AND ${shopScope()}
      ORDER BY branches.name`,
      [userId]
    );
    res.json(branche.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  const { name,location } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }
  try {
    const db = await getDb();
    const organizationid=await db.query(`SELECT organization_id FROM memberships WHERE memberships.user_id=$1`,[userId]);
    if (organizationid.rows.length === 0) {
      return res.status(400).json({ error: 'You are not a member of any organization' });
    }
    const organization_id=organizationid.rows[0].organization_id;
    const branche=await db.query(
      `INSERT INTO branches (name,location,organization_id) VALUES ($1,$2,$3) RETURNING *`,
      [name,location,organization_id]
    );
    res.json(branche.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This company already has a shop with that name' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }});

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
      const name = String(item.name || '').trim();
      const location = String(item.location || '').trim();
      if (!name || !location) {
        errors.push({ row, message: 'Shop name and address are required' });
        continue;
      }
      ready.push({ row, name, location });
    }
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fix the rows and try again', errors });
    }
    for (const item of ready) {
      try {
        await client.query(
          `INSERT INTO branches (name, location, organization_id) VALUES ($1, $2, $3)`,
          [item.name, item.location, organizationId]
        );
      } catch (error) {
        if (error.code === '23505') {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'This company already has a shop with that name',
            errors: [{ row: item.row, message: 'This company already has a shop with that name' }],
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
