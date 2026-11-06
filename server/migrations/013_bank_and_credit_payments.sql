ALTER TABLE stock_transactions
  ADD COLUMN bank_name text;

UPDATE stock_transactions
SET bank_name = 'Not recorded'
WHERE type = 'OUT'
  AND payment = 'transfer'
  AND (bank_name IS NULL OR length(trim(bank_name)) = 0);

ALTER TABLE stock_transactions DROP CONSTRAINT stock_transactions_sale_check;

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_sale_check CHECK (
    (
      type <> 'OUT'
      AND bank_name IS NULL
    )
    OR (
      type = 'OUT'
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
  );

CREATE TABLE credit_payments (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id integer NOT NULL REFERENCES stock_transactions(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  payment text NOT NULL CHECK (payment IN ('cash', 'transfer')),
  bank_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (payment = 'cash' AND bank_name IS NULL)
    OR (payment = 'transfer' AND bank_name IS NOT NULL AND length(trim(bank_name)) > 0)
  )
);

CREATE INDEX idx_credit_payments_sale ON credit_payments (sale_id);
