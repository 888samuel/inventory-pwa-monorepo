import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool, Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../migrations');

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/inventory';

let pool;

function databaseNameFrom(value) {
  const name = new URL(value).pathname.replace(/^\//, '');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unsupported database name: ${name}`);
  }
  return name;
}

async function ensureDatabase() {
  const databaseName = databaseNameFrom(connectionString);
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(
        'PostgreSQL is not running. Start it with npm run db, then start the server again.',
        { cause: error },
      );
    }
    throw error;
  }

  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${databaseName}`);
    }
  } finally {
    await admin.end();
  }
}

async function migrate(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedResult = await db.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedResult.rows.map((row) => row.name));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function getDb() {
  if (pool) return pool;

  await ensureDatabase();
  const created = new Pool({ connectionString });
  try {
    await migrate(created);
  } catch (error) {
    await created.end();
    throw error;
  }

  pool = created;
  return pool;
}
