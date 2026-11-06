import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const db = await getDb();
  const owners = await db.query(
    
    `SELECT users.id, users.name, users.email, organizations.name AS organization_name
    FROM users
    JOIN memberships ON users.id = memberships.user_id
    JOIN organizations ON memberships.organization_id = organizations.id
    WHERE memberships.role = 'owner'`,
  );
  res.json(owners.rows);
});

export default router;