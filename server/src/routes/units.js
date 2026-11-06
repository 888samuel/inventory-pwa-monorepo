import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!req.cookies.userId) return res.status(401).json({ error: 'Login required' });
  try {
    const db = await getDb();
    const result = await db.query(`SELECT code, name FROM units ORDER BY id`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;