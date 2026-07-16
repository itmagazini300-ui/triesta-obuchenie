import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { initSchema, db } from './db.js';
import { attachUser } from './auth.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import learnRoutes from './routes/learn.js';
import managerRoutes from './routes/manager.js';
import adminRoutes from './routes/admin.js';

const PORT = process.env.PORT || 4000;

initSchema();

// Автоматично зареждане на примерни данни при първо стартиране
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  console.log('▸ Празна база – зареждам примерни данни...');
  seed();
}

const app = express();
app.set('trust proxy', 1); // зад HTTPS proxy (хостинг/тунел)
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);

// В режим на качване сървърът сервира и готовия сайт (client/dist),
// така че всичко работи на един адрес.
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // Всеки не-API GET заявка връща приложението (за да работят вътрешните адреси).
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(join(clientDist, 'index.html'));
    next();
  });
  console.log('▸ Сервирам готовия сайт от client/dist');
}

app.listen(PORT, () => {
  console.log(`\n  ✔ Сървърът на „300 Триста – Обучения" работи на http://localhost:${PORT}\n`);
});
