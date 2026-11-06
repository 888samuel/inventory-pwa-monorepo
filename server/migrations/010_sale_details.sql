ALTER TABLE stock_transactions
  ADD COLUMN customer_id integer REFERENCES customers(id),
  ADD COLUMN payment text,
  ADD COLUMN unit_id integer REFERENCES units(id);

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_sale_check CHECK (
    type <> 'OUT'
    OR (
      customer_id IS NOT NULL
      AND payment IN ('cash', 'credit')
      AND unit_id IS NOT NULL
    )
  );
