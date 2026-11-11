ALTER TABLE organizations
  ADD COLUMN price_mode text NOT NULL DEFAULT 'dynamic'
  CHECK (price_mode IN ('fixed', 'dynamic'));

CREATE TABLE banks (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX idx_banks_name_per_org
  ON banks (organization_id, lower(name));

INSERT INTO permissions (code, description) VALUES
  ('settings.manage', 'Configure settings');
