import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { attachUser } from './auth.js';
import authRoutes from './routes/auth.js';
import learnRoutes from './routes/learn.js';
import managerRoutes from './routes/manager.js';
import adminRoutes from './routes/admin.js';
import applyRoutes from './routes/apply.js';
import storesRoutes from './routes/stores.js';
import companiesRoutes from './routes/companies.js';
import discRequestsRoutes from './routes/discRequests.js';
import publicDiscRoutes from './routes/publicDisc.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // зад HTTPS proxy (хостинг/тунел)
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/learn', learnRoutes);
  app.use('/api/manager/disc-requests', discRequestsRoutes);
  app.use('/api/manager', managerRoutes);
  app.use('/api/admin/stores', storesRoutes);
  app.use('/api/admin/companies', companiesRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/apply', applyRoutes); // публичен – без вход
  app.use('/api/public/disc', publicDiscRoutes); // публичен – без вход

  // В режим на качване сървърът сервира и готовия сайт (client/dist),
  // така че всичко работи на един адрес.
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  if (existsSync(join(clientDist, 'index.html')) && !process.env.NODE_TEST_CONTEXT) {
    app.use(express.static(clientDist));
    // Всеки не-API GET заявка връща приложението (за да работят вътрешните адреси).
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(join(clientDist, 'index.html'));
      next();
    });
    console.log('▸ Сервирам готовия сайт от client/dist');
  }
  return app;
}
