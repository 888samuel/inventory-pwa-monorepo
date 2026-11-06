INSERT INTO permissions (code, description) VALUES
  ('transfer.order', 'Order a transfer'),
  ('transfer.confirm', 'Confirm a transfer when it is accepted');

INSERT INTO membership_permissions (membership_id, permission_code)
SELECT membership_id, 'transfer.order'
FROM membership_permissions
WHERE permission_code = 'transfer'
ON CONFLICT DO NOTHING;

INSERT INTO membership_permissions (membership_id, permission_code)
SELECT membership_id, 'transfer.confirm'
FROM membership_permissions
WHERE permission_code = 'transfer'
ON CONFLICT DO NOTHING;

DELETE FROM membership_permissions WHERE permission_code = 'transfer';
DELETE FROM permissions WHERE code = 'transfer';

CREATE TABLE transfer_orders (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id),
  source_branch_id integer NOT NULL REFERENCES branches(id),
  destination_branch_id integer NOT NULL REFERENCES branches(id),
  product_id integer NOT NULL REFERENCES products(id),
  unit_id integer NOT NULL REFERENCES units(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL CHECK (status IN ('ordered', 'accepted')),
  ordered_by integer NOT NULL REFERENCES users(id),
  accepted_by integer REFERENCES users(id),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  stock_transaction_id integer REFERENCES stock_transactions(id),
  CHECK (source_branch_id <> destination_branch_id),
  CHECK (
    (
      status = 'ordered'
      AND accepted_by IS NULL
      AND accepted_at IS NULL
      AND stock_transaction_id IS NULL
    )
    OR (
      status = 'accepted'
      AND accepted_by IS NOT NULL
      AND accepted_at IS NOT NULL
      AND stock_transaction_id IS NOT NULL
    )
  )
);

CREATE INDEX idx_transfer_orders_destination
  ON transfer_orders (destination_branch_id, status);
