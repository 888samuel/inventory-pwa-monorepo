ALTER TABLE stock_transactions
  ADD COLUMN supplier_id integer REFERENCES suppliers(id);

CREATE TABLE shop_purchase_counters (
  branch_id integer PRIMARY KEY REFERENCES branches(id),
  last_number integer NOT NULL CHECK (last_number >= 0)
);

CREATE UNIQUE INDEX idx_purchases_invoice_per_shop
  ON stock_transactions (destination_branch_id, invoice_number)
  WHERE type = 'IN';

ALTER TABLE stock_transactions DROP CONSTRAINT stock_transactions_sale_check;
ALTER TABLE stock_transactions DROP CONSTRAINT stock_transactions_sale_price;

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_movement_check CHECK (
    (
      type NOT IN ('OUT', 'IN')
      AND supplier_id IS NULL
      AND bank_name IS NULL
    )
    OR (
      type = 'OUT'
      AND supplier_id IS NULL
      AND customer_id IS NOT NULL
      AND unit_id IS NOT NULL
      AND unit_price IS NOT NULL
      AND invoice_number IS NOT NULL
      AND payment IN ('cash', 'transfer', 'credit')
      AND (
        (
          payment = 'cash'
          AND credit_kind IS NULL
          AND paid_cents = unit_price * quantity
          AND bank_name IS NULL
        )
        OR (
          payment = 'transfer'
          AND credit_kind IS NULL
          AND paid_cents = unit_price * quantity
          AND bank_name IS NOT NULL
          AND length(trim(bank_name)) > 0
        )
        OR (
          payment = 'credit'
          AND credit_kind = 'full'
          AND paid_cents = 0
          AND bank_name IS NULL
        )
        OR (
          payment = 'credit'
          AND credit_kind = 'partial'
          AND paid_cents > 0
          AND paid_cents < unit_price * quantity
          AND bank_name IS NULL
        )
      )
    )
    OR (
      type = 'IN'
      AND customer_id IS NULL
      AND supplier_id IS NOT NULL
      AND unit_id IS NOT NULL
      AND unit_price IS NOT NULL
      AND invoice_number IS NOT NULL
      AND payment IN ('cash', 'transfer', 'credit')
      AND (
        (
          payment = 'cash'
          AND credit_kind IS NULL
          AND paid_cents = unit_price * quantity
          AND bank_name IS NULL
        )
        OR (
          payment = 'transfer'
          AND credit_kind IS NULL
          AND paid_cents = unit_price * quantity
          AND bank_name IS NOT NULL
          AND length(trim(bank_name)) > 0
        )
        OR (
          payment = 'credit'
          AND credit_kind = 'full'
          AND paid_cents = 0
          AND bank_name IS NULL
        )
        OR (
          payment = 'credit'
          AND credit_kind = 'partial'
          AND paid_cents > 0
          AND paid_cents < unit_price * quantity
          AND bank_name IS NULL
        )
      )
    )
  );
