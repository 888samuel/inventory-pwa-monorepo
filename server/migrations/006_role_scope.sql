ALTER TABLE memberships
  ADD COLUMN manages_all boolean NOT NULL DEFAULT false;

ALTER TABLE memberships
  DROP CONSTRAINT memberships_check;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_role_scope CHECK (
    (role = 'owner' AND branch_id IS NULL AND manages_all = false)
    OR (role IN ('manager', 'cashier') AND branch_id IS NULL)
  );

CREATE TABLE membership_branches (
  membership_id integer NOT NULL REFERENCES memberships(id),
  branch_id integer NOT NULL REFERENCES branches(id),
  PRIMARY KEY (membership_id, branch_id)
);

CREATE TABLE permissions (
  code text PRIMARY KEY,
  description text NOT NULL
);

INSERT INTO permissions (code, description) VALUES
  ('sale', 'Record a sale'),
  ('purchase', 'Record a purchase'),
  ('transfer', 'Move stock between shops'),
  ('products.manage', 'Add products'),
  ('shops.manage', 'Add shops'),
  ('staff.manage', 'Add staff');

CREATE TABLE membership_permissions (
  membership_id integer NOT NULL REFERENCES memberships(id),
  permission_code text NOT NULL REFERENCES permissions(code),
  PRIMARY KEY (membership_id, permission_code)
);