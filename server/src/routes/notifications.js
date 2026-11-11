import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT id, kind, transfer_order_id, body, created_at, read_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );
    res.json(result.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      transferOrderId: row.transfer_order_id,
      body: row.body,
      createdAt: row.created_at,
      readAt: row.read_at,
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/read', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Choose a notification' });
  try {
    const db = await getDb();
    const result = await db.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, now())
       WHERE id = $1 AND user_id = $2
       RETURNING id, read_at`,
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'That notification is not yours' });
    res.json({ id: result.rows[0].id, readAt: result.rows[0].read_at });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
