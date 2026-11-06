import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/pg');
const clusterReady = fs.existsSync(path.join(dataDir, 'PG_VERSION'));

const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!clusterReady) {
  await postgres.initialise();
}

await postgres.start();
console.log('PostgreSQL listening on localhost:5432');

await new Promise(() => {});
