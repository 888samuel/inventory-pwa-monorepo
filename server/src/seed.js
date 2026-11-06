import { getDb } from './db.js';

const db = await getDb();

const branches = [
  { name: 'Main Warehouse', location: '100 Industrial Ave, Springfield' },
  { name: 'Downtown Store', location: '42 Market Street, Springfield' },
];

// unitPrice is stored in cents so money never depends on binary floats.
const products = [
  {
    sku: 'WDG-001',
    name: 'Steel Widget',
    description: 'General-purpose machined widget',
    unitPrice: 1250,
  },
  {
    sku: 'GDG-002',
    name: 'Brass Gadget',
    description: 'Compact brass fitting',
    unitPrice: 2400,
  },
  {
    sku: 'CBL-003',
    name: 'USB-C Cable',
    description: '1m braided charge cable',
    unitPrice: 899,
  },
  {
    sku: 'CSE-004',
    name: 'Phone Case',
    description: 'Shock-resistant protective case',
    unitPrice: 1500,
  },
  {
    sku: 'BAT-005',
    name: 'Battery Pack',
    description: '10,000 mAh portable battery',
    unitPrice: 2999,
  },
];

const stock = [
  { branch: 'Main Warehouse', sku: 'WDG-001', quantity: 120, reorder: 25 },
  { branch: 'Main Warehouse', sku: 'GDG-002', quantity: 80, reorder: 20 },
  { branch: 'Main Warehouse', sku: 'CBL-003', quantity: 200, reorder: 40 },
  { branch: 'Main Warehouse', sku: 'CSE-004', quantity: 60, reorder: 15 },
  { branch: 'Main Warehouse', sku: 'BAT-005', quantity: 40, reorder: 10 },
  { branch: 'Downtown Store', sku: 'WDG-001', quantity: 15, reorder: 5 },
  { branch: 'Downtown Store', sku: 'GDG-002', quantity: 12, reorder: 4 },
  { branch: 'Downtown Store', sku: 'CBL-003', quantity: 40, reorder: 10 },
  { branch: 'Downtown Store', sku: 'CSE-004', quantity: 8, reorder: 3 },
  { branch: 'Downtown Store', sku: 'BAT-005', quantity: 6, reorder: 2 },
];

try {
  const alreadySeeded = await db.query('SELECT id FROM products WHERE sku = $1', ['WDG-001']);

  if (alreadySeeded.rowCount > 0) {
    console.log('Seed data already present. Nothing to do.');
  } else {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const organization = await client.query(
        'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
        ['Springfield Supplies'],
      );
      const organizationId = organization.rows[0].id;

      for (const branch of branches) {
        await client.query(
          'INSERT INTO branches (name, location, organization_id) VALUES ($1, $2, $3)',
          [branch.name, branch.location, organizationId],
        );
      }

      for (const product of products) {
        await client.query(
          'INSERT INTO products (sku, name, description, unit_price, organization_id) VALUES ($1, $2, $3, $4, $5)',
          [product.sku, product.name, product.description, product.unitPrice, organizationId],
        );
      }

      for (const row of stock) {
        await client.query(
          `INSERT INTO branch_inventory (branch_id, product_id, stock_quantity, reorder_threshold)
           VALUES (
             (SELECT id FROM branches WHERE name = $1),
             (SELECT id FROM products WHERE sku = $2),
             $3,
             $4
           )`,
          [row.branch, row.sku, row.quantity, row.reorder],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM branches) AS branches,
        (SELECT COUNT(*)::int FROM products) AS products,
        (SELECT COUNT(*)::int FROM branch_inventory) AS inventory
    `);
    console.log('Seed complete.', counts.rows[0]);
  }
} finally {
  await db.end();
}
