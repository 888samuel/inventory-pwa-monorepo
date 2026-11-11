ALTER TABLE stock_transactions
  ADD COLUMN created_by integer REFERENCES users(id);
