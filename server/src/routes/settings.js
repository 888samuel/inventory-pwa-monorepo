import { Router } from 'express';
import { getDb } from '../db.js';
import { hasPermission, membershipFor } from '../permissions.js';

const router = Router();

async function readSettings(db, organizationId) {
  const mode = await db.query(
    `SELECT price_mode FROM organizations WHERE id = $1`,
    [organizationId]
  );
  const banks = await db.query(
    `SELECT id, name FROM banks WHERE organization_id = $1 ORDER BY lower(name), name`,
    [organizationId]
  );
  return {
    priceMode: mode.rows[0]?.price_mode === 'fixed' ? 'fixed' : 'dynamic',
    banks: banks.rows,
  };
}

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  try {
    const db = await getDb();
    const membership = await membershipFor(db, userId);
    if (!membership) return res.status(403).json({ error: 'You are not a member of any organization' });
    res.json(await readSettings(db, membership.organization_id));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const priceMode = String(req.body?.priceMode || '').trim();
  if (priceMode !== 'fixed' && priceMode !== 'dynamic') {
    return res.status(400).json({ error: 'Choose set prices or dynamic prices' });
  }
  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'settings.manage')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot configure settings' });
    }
    await client.query(
      `UPDATE organizations SET price_mode = $1 WHERE id = $2`,
      [priceMode, membership.organization_id]
    );
    await client.query('COMMIT');
    res.json(await readSettings(db, membership.organization_id));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.post('/banks', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 80) return res.status(400).json({ error: 'Type the bank name' });
  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'settings.manage')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot configure settings' });
    }
    await client.query(
      `INSERT INTO banks (organization_id, name) VALUES ($1, $2)`,
      [membership.organization_id, name]
    );
    await client.query('COMMIT');
    res.status(201).json(await readSettings(db, membership.organization_id));
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'idx_banks_name_per_org') {
      return res.status(409).json({ error: 'That bank is already in the list' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.delete('/banks/:id', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const bankId = Number(req.params.id);
  if (!Number.isInteger(bankId) || bankId < 1) return res.status(400).json({ error: 'Choose a bank' });
  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'settings.manage')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot configure settings' });
    }
    const removed = await client.query(
      `DELETE FROM banks WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [bankId, membership.organization_id]
    );
    if (removed.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'That bank is not in this company' });
    }
    await client.query('COMMIT');
    res.json(await readSettings(db, membership.organization_id));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
