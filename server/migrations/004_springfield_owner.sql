WITH new_user AS (
  INSERT INTO users (name, email, password_hash)
  VALUES ('sami', 'sami@springfield.com', 'dev-hash-not-a-password')
  RETURNING id
)
INSERT INTO memberships (organization_id, user_id, role)
SELECT organizations.id, new_user.id, 'owner'
FROM organizations
JOIN new_user ON true
WHERE organizations.name = 'Springfield';