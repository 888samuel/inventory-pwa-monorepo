import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';

const router = Router();

router.post('/', async (req, res) => {
  const name = req.body?.name?.trim();
  const email = req.body?.email?.trim();
  const phone = req.body?.phone?.trim()||null;
  const password = req.body?.password;
  const organizationName = req.body?.organizationName?.trim();

  if (!name || !email || !password || !organizationName) {
    return res.status(400).json({
      error: 'name, email, password, and organizationName are required',
    });
  }
  if(password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
    });
  }
  if(phone &&!/^\+?[0-9]{8,15}$/.test(phone)) {
    return res.status(400).json({
      error: 'Phone must be a valid phone number',
    });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const db = await getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const organization = await client.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
      [organizationName],
    );
    const user = await client.query(
      'INSERT INTO users (name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, passwordHash, phone],
    );
    await client.query(
      'INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, $3)',
      [organization.rows[0].id, user.rows[0].id, 'owner'],
    );

    await client.query('COMMIT');
    res.status(201).json({
      id: user.rows[0].id,
      name,
      email,
      organizationId: organization.rows[0].id,
      organizationName,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'idx_users_phone') {
      return res.status(409).json({ error: 'Phone is already registered' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    throw error;
  } finally {
    client.release();
  }
});

export default router;
