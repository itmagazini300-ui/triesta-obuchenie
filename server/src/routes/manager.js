import { Router } from 'express';
import { requireManager } from '../auth.js';
import { db } from '../db.js';
import { getCatalog } from '../progressCalc.js';
import { levelFor } from '../levels.js';

const router = Router();
router.use(requireManager);

// Обобщено табло: всички служители + прогрес
router.get('/overview', (_req, res) => {
  const employees = db
    .prepare("SELECT id, name, email, store, position, mentor, start_date FROM users WHERE role = 'employee' ORDER BY name")
    .all();

  const rows = employees.map((e) => {
    const c = getCatalog(e.id);
    return {
      id: e.id, name: e.name, store: e.store, position: e.position, mentor: e.mentor,
      start_date: e.start_date,
      overall: c.overall,
      level: c.level,
      completedModules: c.completedModules,
      totalModules: c.totalModules,
      completedCategories: c.completedCategories,
      totalCategories: c.totalCategories,
    };
  });

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.overall, 0) / rows.length) : 0;
  const fullyTrained = rows.filter((r) => r.overall === 100).length;
  const atRisk = rows.filter((r) => r.overall < 40).length;

  res.json({
    employees: rows,
    stats: {
      total: rows.length,
      avgProgress: avg,
      avgLevel: levelFor(avg).name,
      fullyTrained,
      atRisk,
    },
  });
});

// Анализ на менторите + KPI и бонус система
const PASS_THRESHOLD = 70;   // служител се брои за „преминал", ако общият прогрес е ≥ 70%
function bonusFor(successRate) {
  if (successRate < 50) return 0;
  if (successRate < 75) return 50;
  return 100;
}

router.get('/mentors', (_req, res) => {
  const mentors = db.prepare("SELECT id, name, store, position, mentor_style, feedback_rating, retention_rate FROM users WHERE is_mentor = 1 ORDER BY name").all();

  const rows = mentors.map((mtr) => {
    const mentees = db.prepare("SELECT id, name, position, store, start_date, mentorship_done_at FROM users WHERE mentor = ? AND role = 'employee' AND id != ?").all(mtr.name, mtr.id);
    const activeList = mentees.filter((e) => !e.mentorship_done_at).map((e) => ({ id: e.id, name: e.name, store: e.store, start_date: e.start_date }));
    const doneList = mentees.filter((e) => e.mentorship_done_at).map((e) => ({ id: e.id, name: e.name, mentorship_done_at: e.mentorship_done_at }));
    const menteeData = mentees.map((e) => {
      const c = getCatalog(e.id);
      return { id: e.id, name: e.name, position: e.position, overall: c.overall, level: c.level };
    });
    const count = menteeData.length;
    const passed = menteeData.filter((m) => m.overall >= PASS_THRESHOLD).length;
    const successRate = count ? Math.round((passed / count) * 100) : 0;
    const avgProgress = count ? Math.round(menteeData.reduce((s, m) => s + m.overall, 0) / count) : 0;
    const feedback = mtr.feedback_rating ?? 0;
    const retention = mtr.retention_rate ?? 0;
    // Композитен резултат за рейтинга и „Ментор на годината"
    const score = Math.round(successRate * 0.5 + (feedback / 5) * 100 * 0.3 + retention * 0.2);
    return {
      id: mtr.id, name: mtr.name, store: mtr.store, position: mtr.position, mentor_style: mtr.mentor_style,
      active: activeList.length, activeList, doneList,
      mentees: count, passed, successRate, avgProgress,
      feedback, retention, bonus: bonusFor(successRate), score,
      menteeList: menteeData.sort((a, b) => b.overall - a.overall),
    };
  });

  rows.sort((a, b) => b.score - a.score);
  const topId = rows.length ? rows[0].id : null;

  res.json({
    mentors: rows,
    mentorOfYearId: topId,
    stats: {
      total: rows.length,
      totalMentees: rows.reduce((s, r) => s + r.mentees, 0),
      totalActive: rows.reduce((s, r) => s + r.active, 0),
      avgSuccess: rows.length ? Math.round(rows.reduce((s, r) => s + r.successRate, 0) / rows.length) : 0,
      avgFeedback: rows.length ? (rows.reduce((s, r) => s + r.feedback, 0) / rows.length).toFixed(1) : '0.0',
    },
    bonusBands: [
      { range: '0–50%', amount: 0, note: 'Не са постигнати минималните изисквания.' },
      { range: '50–75%', amount: 50, note: 'Добри резултати и изпълнени основни цели.' },
      { range: '75–100%', amount: 100, note: 'Отлично представяне и устойчиви резултати.' },
    ],
    yearBonus: 500,
  });
});

// Управителят маркира, че служителят е завършил обучението при ментора си.
router.post('/mentees/:id/complete', (req, res) => {
  const u = db.prepare("SELECT id, mentor, mentorship_done_at FROM users WHERE id = ? AND role = 'employee' AND mentor IS NOT NULL").get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Служителят не е намерен.' });
  if (u.mentorship_done_at) return res.status(409).json({ error: 'Вече е маркиран като завършил.' });
  db.prepare("UPDATE users SET mentorship_done_at = datetime('now') WHERE id = ?").run(u.id);
  res.json({ ok: true });
});

// Кандидати (от публичната форма за работа)
const APP_STATUSES = ['new', 'contacted', 'interview', 'hired', 'rejected'];

router.get('/applications', (_req, res) => {
  const applications = db.prepare('SELECT * FROM applications ORDER BY created_at DESC, id DESC').all();
  const counts = {};
  for (const s of APP_STATUSES) counts[s] = 0;
  for (const a of applications) counts[a.status] = (counts[a.status] || 0) + 1;
  res.json({ applications, counts, total: applications.length });
});

router.patch('/applications/:id', (req, res) => {
  const status = req.body?.status;
  if (!APP_STATUSES.includes(status)) return res.status(400).json({ error: 'Невалиден статус.' });
  const info = db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Кандидатът не е намерен.' });
  res.json({ ok: true });
});

router.delete('/applications/:id', (req, res) => {
  db.prepare('DELETE FROM applications WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Детайл за конкретен служител (по модули)
router.get('/employees/:id', (req, res) => {
  const e = db
    .prepare("SELECT id, name, email, store, position, mentor, start_date, disc_result FROM users WHERE id = ? AND role = 'employee'")
    .get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Служителят не е намерен.' });

  const catalog = getCatalog(e.id);
  res.json({ employee: e, ...catalog });
});

export default router;
