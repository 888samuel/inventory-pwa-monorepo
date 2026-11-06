ALTER TABLE stock_transactions
  ADD COLUMN unit_price integer CHECK (unit_price IS NULL OR unit_price >= 0);

UPDATE stock_transactions
SET unit_price = products.unit_price
FROM products
WHERE stock_transactions.product_id = products.id
  AND stock_transactions.type = 'OUT'
  AND stock_transactions.unit_price IS NULL
  AND products.unit_price IS NOT NULL;

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_sale_price CHECK (
    type <> 'OUT' OR unit_price IS NOT NULL
  );
