CREATE TABLE branches (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  location text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(name)) > 0),
  CHECK (length(trim(location)) > 0)
);

CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(sku)) > 0),
  CHECK (length(trim(name)) > 0)
);

CREATE TABLE branch_inventory (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id integer NOT NULL REFERENCES branches(id),
  product_id integer NOT NULL REFERENCES products(id),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_threshold integer NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, product_id)
);

CREATE TABLE stock_transactions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_branch_id integer REFERENCES branches(id),
  destination_branch_id integer REFERENCES branches(id),
  product_id integer NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  type text NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER')),
  reference_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (type = 'IN' AND source_branch_id IS NULL AND destination_branch_id IS NOT NULL)
    OR (type = 'OUT' AND source_branch_id IS NOT NULL AND destination_branch_id IS NULL)
    OR (
      type = 'TRANSFER'
      AND source_branch_id IS NOT NULL
      AND destination_branch_id IS NOT NULL
      AND source_branch_id != destination_branch_id
    )
  )
);

CREATE INDEX idx_branch_inventory_branch ON branch_inventory(branch_id);
CREATE INDEX idx_branch_inventory_product ON branch_inventory(product_id);
CREATE INDEX idx_stock_transactions_product ON stock_transactions(product_id);
CREATE INDEX idx_stock_transactions_created ON stock_transactions(created_at);
