import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { getCatalog, getModule, markOpened, submitTest } from '../progressCalc.js';

const router = Router();
router.use(requireAuth);

// Целият каталог с прогреса на служителя
router.get('/catalog', (req, res) => {
  res.json(getCatalog(req.user.id));
});

// Един модул с урок и тест
router.get('/modules/:id', (req, res) => {
  const data = getModule(req.user.id, Number(req.params.id));
  if (!data) return res.status(404).json({ error: 'Модулът не е намерен.' });
  res.json(data);
});

// Отваряне на модул -> отбелязва "в процес"
router.post('/modules/:id/open', (req, res) => {
  markOpened(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

// Предаване на теста
router.post('/modules/:id/submit', (req, res) => {
  const result = submitTest(req.user.id, Number(req.params.id), req.body?.answers || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Завършените категории = сертификати
router.get('/certificates', (req, res) => {
  const catalog = getCatalog(req.user.id);
  const certs = catalog.categories
    .filter((c) => c.completed)
    .map((c) => {
      const last = c.modules
        .map((m) => m.completed_at)
        .filter(Boolean)
        .sort()
        .pop();
      return { category: c.title, icon: c.icon, slug: c.slug, date: last, moduleCount: c.moduleCount };
    });
  res.json({ certificates: certs, level: catalog.level, overall: catalog.overall });
});

export default router;
