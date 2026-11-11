UPDATE permissions
SET description = 'Accept a transfer order'
WHERE code = 'transfer.confirm';

CREATE TABLE notifications (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  organization_id integer NOT NULL REFERENCES organizations(id),
  kind text NOT NULL,
  transfer_order_id integer REFERENCES transfer_orders(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
