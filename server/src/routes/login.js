import { Router } from 'express';
import { getDb } from '../db.js';
import bcrypt from 'bcryptjs';
import { membershipFor, permissionCodes } from '../permissions.js';

const router = Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const user = await db.query(
    `SELECT users.id, users.name, users.email, users.password_hash,
            organizations.id AS organizations_id, organizations.name AS organization_name
    FROM users
    JOIN memberships ON users.id = memberships.user_id
    JOIN organizations ON memberships.organization_id = organizations.id
    WHERE users.email = $1`,[email],
  );
  if (!user.rows.length) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid  password' });
  }
  delete user.rows[0].password_hash;
  const membership = await membershipFor(db, user.rows[0].id);
  user.rows[0].role = membership?.role ?? null;
  user.rows[0].permissions = await permissionCodes(db, membership);
  res.cookie('userId', user.rows[0].id, { httpOnly: true, sameSite: 'lax' });
  res.json({ user: user.rows[0] });
});

export default router;