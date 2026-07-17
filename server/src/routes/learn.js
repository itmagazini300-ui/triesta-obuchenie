import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { getCatalog, getModule, markOpened, submitTest, moduleLocked } from '../progressCalc.js';
import { DISC_STYLES, DISC_QUESTIONS, scoreDisc } from '../disc.js';

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

// ── Видео уроци (за гледане от служителя) ──
router.get('/videos', (_req, res) => {
  const videos = db.prepare('SELECT id, title, description, video_url, duration, category FROM videos ORDER BY order_index, id').all();
  res.json({ videos });
});

// ── Приветствен екран ──
router.post('/welcome-seen', (req, res) => {
  db.prepare('UPDATE users SET seen_welcome = 1 WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ── DISC тест ──
router.get('/disc', (req, res) => {
  const u = db.prepare('SELECT disc_result, disc_taken_at FROM users WHERE id = ?').get(req.user.id);
  res.json({
    styles: DISC_STYLES,
    questions: DISC_QUESTIONS,
    result: u?.disc_result || null,
    takenAt: u?.disc_taken_at || null,
  });
});

router.post('/disc', (req, res) => {
  const answers = req.body?.answers || {};
  const answered = DISC_QUESTIONS.every((q) => answers[q.id]);
  if (!answered) return res.status(400).json({ error: 'Отговори на всички въпроси.' });
  const { scores, primary } = scoreDisc(answers);
  db.prepare("UPDATE users SET disc_result = ?, disc_taken_at = datetime('now') WHERE id = ?").run(primary, req.user.id);
  res.json({ scores, primary, styles: DISC_STYLES });
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
