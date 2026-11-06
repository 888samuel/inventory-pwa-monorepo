ALTER TABLE users
  ADD COLUMN phone text;

ALTER TABLE users
  ADD CONSTRAINT users_phone_shape CHECK (
    phone IS NULL OR phone ~ '^\+?[0-9]{8,15}$'
  );

CREATE UNIQUE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;