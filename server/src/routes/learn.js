import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { getCatalog, getModule, markOpened, submitTest, moduleLocked } from '../progressCalc.js';

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

const LOCKED_MSG = 'Този модул още е заключен. Първо завърши предишния модул.';

// Отваряне на модул -> отбелязва "в процес"
router.post('/modules/:id/open', (req, res) => {
  const id = Number(req.params.id);
  if (moduleLocked(req.user.id, id)) return res.status(403).json({ error: LOCKED_MSG });
  markOpened(req.user.id, id);
  res.json({ ok: true });
});

// Предаване на теста
router.post('/modules/:id/submit', (req, res) => {
  const id = Number(req.params.id);
  if (moduleLocked(req.user.id, id)) return res.status(403).json({ error: LOCKED_MSG });
  const result = submitTest(req.user.id, id, req.body?.answers || {});
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
