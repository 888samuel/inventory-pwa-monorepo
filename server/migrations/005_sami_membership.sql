INSERT INTO memberships (organization_id, user_id, role)
VALUES (
  (SELECT id FROM organizations WHERE name = 'Springfield Supplies'),
  (SELECT id FROM users WHERE email = 'sami@springfield.com'),
  'owner'
);