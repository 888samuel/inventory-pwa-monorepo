CREATE TABLE organizations (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(name)) > 0)
);

CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(name)) > 0),
  CHECK (position('@' in email) > 1)
);

CREATE UNIQUE INDEX idx_users_email ON users (lower(email));

CREATE TABLE memberships (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id),
  user_id integer NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  branch_id integer REFERENCES branches(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id),
  CHECK (
    (role = 'cashier' AND branch_id IS NOT NULL)
    OR (role IN ('owner', 'manager') AND branch_id IS NULL)
  )
);

CREATE INDEX idx_memberships_organization ON memberships(organization_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_branch ON memberships(branch_id);
