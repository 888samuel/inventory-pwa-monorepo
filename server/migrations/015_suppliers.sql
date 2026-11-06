CREATE TABLE suppliers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  tin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(name)) > 0),
  CHECK (length(trim(tin)) > 0)
);

CREATE UNIQUE INDEX idx_suppliers_tin
  ON suppliers (organization_id, lower(tin));
