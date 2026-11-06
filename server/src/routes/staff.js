import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { hasPermission, membershipFor } from '../permissions.js';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  try {
    const db = await getDb();
    const membership = await membershipFor(db, userId);
    if (!membership || !await hasPermission(db, membership, 'staff.manage')) {
      return res.status(403).json({ error: 'You cannot add users' });
    }
    const permissions = await db.query(
      `SELECT code, description FROM permissions ORDER BY description`
    );
    const shops = await db.query(
      `SELECT id, name FROM branches WHERE organization_id = $1 ORDER BY name`,
      [membership.organization_id]
    );
    const users = await db.query(
      `SELECT users.id,
              users.name,
              users.email,
              users.phone,
              memberships.role,
              memberships.manages_all,
              ARRAY(
                SELECT branches.id
                FROM membership_branches
                JOIN branches ON branches.id = membership_branches.branch_id
                WHERE membership_branches.membership_id = memberships.id
                ORDER BY branches.name
              ) AS shop_ids,
              ARRAY(
                SELECT branches.name
                FROM membership_branches
                JOIN branches ON branches.id = membership_branches.branch_id
                WHERE membership_branches.membership_id = memberships.id
                ORDER BY branches.name
              ) AS shops,
              ARRAY(
                SELECT membership_permissions.permission_code
                FROM membership_permissions
                WHERE membership_permissions.membership_id = memberships.id
                ORDER BY membership_permissions.permission_code
              ) AS permissions
       FROM memberships
       JOIN users ON users.id = memberships.user_id
       WHERE memberships.organization_id = $1
       ORDER BY users.name`,
      [membership.organization_id]
    );
    res.json({
      permissions: permissions.rows,
      shops: shops.rows,
      users: users.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        managesAll: row.manages_all,
        shopIds: row.shop_ids,
        shops: row.shops,
        permissions: row.permissions,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function readStaffBody(body, { passwordRequired }) {
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim();
  const phoneRaw = String(body?.phone || '').trim();
  const phone = phoneRaw || null;
  const password = String(body?.password || '');
  const role = String(body?.role || '').trim();
  const managesAll = body?.managesAll === true;
  const branchIds = [...new Set(
    (Array.isArray(body?.branchIds) ? body.branchIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
  const permissions = [...new Set(
    (Array.isArray(body?.permissions) ? body.permissions : [])
      .map((code) => String(code).trim())
      .filter(Boolean)
  )];
  if (!name || !email || (passwordRequired && !password)) {
    return { error: 'Name, email, and password are required' };
  }
  if (password && password.length < 8) {
    return { error: 'Password must be at least 8 characters long' };
  }
  if (!(email.includes('@') && email.indexOf('@') > 0 && !email.includes(' '))) {
    return { error: 'Email must include @' };
  }
  if (phone && !/^\+?[0-9]{8,15}$/.test(phone)) {
    return { error: 'Phone must be 8 to 15 digits' };
  }
  if (role !== 'manager' && role !== 'cashier') {
    return { error: 'Choose cashier or manager' };
  }
  if (!managesAll && branchIds.length === 0) {
    return { error: 'Choose at least one shop, or every shop' };
  }
  return { name, email, phone, password, role, managesAll, branchIds, permissions };
}

async function assertShopsAndPermissions(client, organizationId, managesAll, branchIds, permissions) {
  if (!managesAll) {
    const shops = await client.query(
      `SELECT id FROM branches WHERE organization_id = $1 AND id = ANY($2::int[])`,
      [organizationId, branchIds]
    );
    if (shops.rows.length !== branchIds.length) {
      return 'Choose a shop in this company';
    }
  }
  if (permissions.length > 0) {
    const known = await client.query(
      `SELECT code FROM permissions WHERE code = ANY($1::text[])`,
      [permissions]
    );
    if (known.rows.length !== permissions.length) {
      return 'Choose a permission from the list';
    }
  }
  return null;
}

router.post('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const input = readStaffBody(req.body, { passwordRequired: true });
  if (input.error) return res.status(400).json({ error: input.error });

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'staff.manage')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot add users' });
    }
    const invalid = await assertShopsAndPermissions(client, membership.organization_id, input.managesAll, input.branchIds, input.permissions);
    if (invalid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: invalid });
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await client.query(
      `INSERT INTO users (name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.name, input.email, passwordHash, input.phone]
    );
    const created = await client.query(
      `INSERT INTO memberships (organization_id, user_id, role, manages_all)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [membership.organization_id, user.rows[0].id, input.role, input.managesAll]
    );
    if (!input.managesAll) {
      for (const branchId of input.branchIds) {
        await client.query(
          `INSERT INTO membership_branches (membership_id, branch_id) VALUES ($1, $2)`,
          [created.rows[0].id, branchId]
        );
      }
    }
    for (const code of input.permissions) {
      await client.query(
        `INSERT INTO membership_permissions (membership_id, permission_code) VALUES ($1, $2)`,
        [created.rows[0].id, code]
      );
    }
    await client.query('COMMIT');
    return res.status(201).json({
      id: user.rows[0].id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      managesAll: input.managesAll,
      branchIds: input.managesAll ? [] : input.branchIds,
      permissions: input.permissions,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'idx_users_phone') {
      return res.status(409).json({ error: 'Phone is already used' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already used' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId < 1) {
    return res.status(400).json({ error: 'Choose a user' });
  }
  const input = readStaffBody(req.body, { passwordRequired: false });
  if (input.error) return res.status(400).json({ error: input.error });

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'staff.manage')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot change users' });
    }
    const target = await client.query(
      `SELECT memberships.id, memberships.role
       FROM memberships
       WHERE memberships.user_id = $1 AND memberships.organization_id = $2
       FOR UPDATE`,
      [targetId, membership.organization_id]
    );
    if (target.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'That user is not in this company' });
    }
    if (target.rows[0].role === 'owner') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The owner stays with the company' });
    }
    const invalid = await assertShopsAndPermissions(client, membership.organization_id, input.managesAll, input.branchIds, input.permissions);
    if (invalid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: invalid });
    }
    if (input.password) {
      const passwordHash = await bcrypt.hash(input.password, 10);
      await client.query(
        `UPDATE users SET name = $1, email = $2, phone = $3, password_hash = $4 WHERE id = $5`,
        [input.name, input.email, input.phone, passwordHash, targetId]
      );
    } else {
      await client.query(
        `UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4`,
        [input.name, input.email, input.phone, targetId]
      );
    }
    const membershipId = target.rows[0].id;
    await client.query(
      `UPDATE memberships SET role = $1, manages_all = $2 WHERE id = $3`,
      [input.role, input.managesAll, membershipId]
    );
    await client.query(`DELETE FROM membership_branches WHERE membership_id = $1`, [membershipId]);
    await client.query(`DELETE FROM membership_permissions WHERE membership_id = $1`, [membershipId]);
    if (!input.managesAll) {
      for (const branchId of input.branchIds) {
        await client.query(
          `INSERT INTO membership_branches (membership_id, branch_id) VALUES ($1, $2)`,
          [membershipId, branchId]
        );
      }
    }
    for (const code of input.permissions) {
      await client.query(
        `INSERT INTO membership_permissions (membership_id, permission_code) VALUES ($1, $2)`,
        [membershipId, code]
      );
    }
    await client.query('COMMIT');
    return res.json({
      id: targetId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      managesAll: input.managesAll,
      permissions: input.permissions,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'idx_users_phone') {
      return res.status(409).json({ error: 'Phone is already used' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already used' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId < 1) {
    return res.status(400).json({ error: 'Choose a user' });
  }
  if (Number(userId) === targetId) {
    return res.status(400).json({ error: 'You cannot delete your own login' });
  }

  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const membership = await membershipFor(client, userId);
    if (!membership || !await hasPermission(client, membership, 'staff.manage')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot delete users' });
    }
    const target = await client.query(
      `SELECT memberships.id, memberships.role, users.name
       FROM memberships
       JOIN users ON users.id = memberships.user_id
       WHERE memberships.user_id = $1 AND memberships.organization_id = $2
       FOR UPDATE OF memberships`,
      [targetId, membership.organization_id]
    );
    if (target.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'That user is not in this company' });
    }
    if (target.rows[0].role === 'owner') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The owner stays with the company' });
    }
    const membershipId = target.rows[0].id;
    await client.query(`DELETE FROM membership_permissions WHERE membership_id = $1`, [membershipId]);
    await client.query(`DELETE FROM membership_branches WHERE membership_id = $1`, [membershipId]);
    await client.query(`DELETE FROM memberships WHERE id = $1`, [membershipId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [targetId]);
    await client.query('COMMIT');
    return res.json({ id: targetId, name: target.rows[0].name });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23503') {
      return res.status(409).json({ error: 'This person has transfer history and cannot be deleted' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
