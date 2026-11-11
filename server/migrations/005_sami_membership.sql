INSERT INTO memberships (organization_id, user_id, role)
SELECT organizations.id, users.id, 'owner'
FROM organizations
JOIN users ON users.email = 'sami@springfield.com'
WHERE organizations.name = 'Springfield Supplies'
  AND NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = organizations.id
      AND memberships.user_id = users.id
  );