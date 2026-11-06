ALTER TABLE stock_transactions
  ADD COLUMN invoice_number integer,
  ADD COLUMN credit_kind text,
  ADD COLUMN paid_cents integer CHECK (paid_cents IS NULL OR paid_cents >= 0);

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY source_branch_id ORDER BY id) AS n
  FROM stock_transactions
  WHERE type = 'OUT'
)
UPDATE stock_transactions
SET invoice_number = numbered.n
FROM numbered
WHERE stock_transactions.id = numbered.id;

UPDATE stock_transactions
SET paid_cents = unit_price * quantity
WHERE type = 'OUT'
  AND payment IN ('cash', 'transfer')
  AND paid_cents IS NULL;

CREATE UNIQUE INDEX idx_sales_invoice_per_shop
  ON stock_transactions (source_branch_id, invoice_number)
  WHERE type = 'OUT';

CREATE TABLE shop_invoice_counters (
  branch_id integer PRIMARY KEY REFERENCES branches(id),
  last_number integer NOT NULL CHECK (last_number >= 0)
);

INSERT INTO shop_invoice_counters (branch_id, last_number)
SELECT source_branch_id, MAX(invoice_number)
FROM stock_transactions
WHERE type = 'OUT' AND invoice_number IS NOT NULL
GROUP BY source_branch_id;

ALTER TABLE stock_transactions DROP CONSTRAINT stock_transactions_sale_check;

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_sale_check CHECK (
    type <> 'OUT'
    OR (
      customer_id IS NOT NULL
      AND unit_id IS NOT NULL
      AND unit_price IS NOT NULL
      AND invoice_number IS NOT NULL
      AND payment IN ('cash', 'transfer', 'credit')
      AND (
        (payment IN ('cash', 'transfer') AND credit_kind IS NULL AND paid_cents = unit_price * quantity)
        OR (payment = 'credit' AND credit_kind = 'full' AND paid_cents = 0)
        OR (
          payment = 'credit'
          AND credit_kind = 'partial'
          AND paid_cents > 0
          AND paid_cents < unit_price * quantity
        )
      )
    )
  );
