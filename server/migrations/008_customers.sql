CREATE TABLE customers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  tin text,
  is_walking boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(name)) > 0),
  CHECK (
    (is_walking AND tin IS NULL)
    OR (NOT is_walking AND tin IS NOT NULL AND length(trim(tin)) > 0)
  )
);

CREATE UNIQUE INDEX idx_customers_one_walking
  ON customers (organization_id)
  WHERE is_walking;

CREATE UNIQUE INDEX idx_customers_tin
  ON customers (organization_id, lower(tin))
  WHERE tin IS NOT NULL;

INSERT INTO customers (organization_id, name, is_walking)
SELECT id, 'Walking customer', true
FROM organizations;