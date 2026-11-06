CREATE TABLE units (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  CHECK (length(trim(code)) > 0),
  CHECK (length(trim(name)) > 0)
);

INSERT INTO units (code, name) VALUES
  ('pcs', 'Piece'),
  ('carton', 'Carton'),
  ('dozen', 'Dozen'),
  ('kg', 'Kilogram'),
  ('litre', 'Litre'),
  ('metre', 'Metre');

ALTER TABLE products
  ADD COLUMN unit_id integer REFERENCES units(id);

UPDATE products
SET unit_id = (SELECT id FROM units WHERE code = 'pcs')
WHERE unit_id IS NULL;

ALTER TABLE products
  ALTER COLUMN unit_id SET NOT NULL;

CREATE INDEX idx_products_unit ON products(unit_id);