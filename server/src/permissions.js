export async function membershipFor(client, userId) {
  const result = await client.query(
    `SELECT id, role, organization_id FROM memberships WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function hasPermission(client, membership, code) {
  if (!membership) return false;
  if (membership.role === 'owner') return true;
  const result = await client.query(
    `SELECT 1 FROM membership_permissions
     WHERE membership_id = $1 AND permission_code = $2`,
    [membership.id, code]
  );
  return result.rows.length > 0;
}

export async function permissionCodes(client, membership) {
  if (!membership) return [];
  if (membership.role === 'owner') {
    const result = await client.query(`SELECT code FROM permissions ORDER BY code`);
    return result.rows.map((row) => row.code);
  }
  const result = await client.query(
    `SELECT permission_code AS code
     FROM membership_permissions
     WHERE membership_id = $1
     ORDER BY permission_code`,
    [membership.id]
  );
  return result.rows.map((row) => row.code);
}
