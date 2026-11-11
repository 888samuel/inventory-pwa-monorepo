import express from 'express';
import branchesRouter from './routes/branches.js';
import ownersRouter from './routes/owners.js';
import registerRouter from './routes/register.js';
import cors from 'cors';
import { getDb } from './db.js';
import loginRouter from './routes/login.js';
import cookieParser from 'cookie-parser';
import productsRouter from './routes/products.js';
import salesRouter from './routes/sales.js';
import customersRouter from './routes/customers.js';
import unitsRouter from './routes/units.js';
import inventoryRouter from './routes/inventory.js';
import suppliersRouter from './routes/suppliers.js';
import purchasesRouter from './routes/purchases.js';
import transfersRouter from './routes/transfers.js';
import staffRouter from './routes/staff.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
const db = await getDb();
const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use('/api/branches', branchesRouter);
app.use('/api/owners', ownersRouter);
app.use('/api/register', registerRouter);
app.use('/api/login', loginRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/units', unitsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/staff', staffRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);
app.get('/api/health', async (_req, res) => {
  const probe = await db.query(`
    SELECT
      1 AS ok,
      current_database() AS database_name,
      current_setting('server_version') AS server_version
  `);
  const row = probe.rows[0];

  res.json({
    status: 'ok',
    database: row?.ok === 1 ? 'connected' : 'error',
    databaseName: row?.database_name,
    serverVersion: row?.server_version,
  });
});
app.get('/api/me', (req, res) => {
  res.json({ userId: req.cookies.userId ?? null });
});
app.post('/api/logout', (req, res) => {
  res.clearCookie('userId', { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true });
});
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
