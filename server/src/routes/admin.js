import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireManager } from '../auth.js';
import { db } from '../db.js';

const router = Router();
router.use(requireManager);

// ─── помощни ───────────────────────────────────────────────
const TRANSLIT = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' };
function slugify(s) {
  const base = (s || '').toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cat';
  let slug = base, i = 1;
  while (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) slug = base + '-' + (++i);
  return slug;
}
function nextOrder(table, col, val) {
  const where = val == null ? '' : `WHERE ${col} = ?`;
  const args = val == null ? [] : [val];
  return db.prepare(`SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM ${table} ${where}`).get(...args).n;
}
function swap(table, siblingsWhere, whereArgs, id, dir) {
  const row = db.prepare(`SELECT id, order_index FROM ${table} WHERE id = ?`).get(id);
  if (!row) return;
  const cmp = dir === 'up' ? '<' : '>';
  const ord = dir === 'up' ? 'DESC' : 'ASC';
  const nb = db.prepare(`SELECT id, order_index FROM ${table} WHERE ${siblingsWhere} AND order_index ${cmp} ? ORDER BY order_index ${ord} LIMIT 1`).get(...whereArgs, row.order_index);
  if (!nb) return;
  db.prepare(`UPDATE ${table} SET order_index = ? WHERE id = ?`).run(nb.order_index, row.id);
  db.prepare(`UPDATE ${table} SET order_index = ? WHERE id = ?`).run(row.order_index, nb.id);
}
function validOptions(options) {
  if (!Array.isArray(options)) return null;
  const cleaned = options.map((o) => String(o ?? '').trim()).filter((o) => o.length > 0);
  return cleaned.length >= 2 ? cleaned : null;
}

// ─── КАТЕГОРИИ ─────────────────────────────────────────────
router.get('/categories', (_req, res) => {
  const cats = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM modules m WHERE m.category_id = c.id) AS moduleCount,
      (SELECT COUNT(*) FROM questions q JOIN modules m ON q.module_id = m.id WHERE m.category_id = c.id) AS questionCount
    FROM categories c ORDER BY order_index, id
  `).all();
  res.json({ categories: cats });
});

router.get('/categories/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(req.params.id));
  if (!cat) return res.status(404).json({ error: 'Категорията не е намерена.' });
  const modules = db.prepare(`
    SELECT m.*, (SELECT COUNT(*) FROM questions q WHERE q.module_id = m.id) AS questionCount
    FROM modules m WHERE category_id = ? ORDER BY order_index, id
  `).all(cat.id);
  res.json({ category: cat, modules });
});

router.post('/categories', (req, res) => {
  const { title, icon, description } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Въведи име на категорията.' });
  const order = nextOrder('categories', null, null);
  const id = db.prepare('INSERT INTO categories (slug, title, icon, description, order_index) VALUES (?, ?, ?, ?, ?)')
    .run(slugify(title), title.trim(), icon || 'book', (description || '').trim(), order).lastInsertRowid;
  res.json({ id });
});

router.put('/categories/:id', (req, res) => {
  const { title, icon, description } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Въведи име на категорията.' });
  const info = db.prepare('UPDATE categories SET title = ?, icon = ?, description = ? WHERE id = ?')
    .run(title.trim(), icon || 'book', (description || '').trim(), Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Категорията не е намерена.' });
  res.json({ ok: true });
});

router.delete('/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.post('/categories/:id/move', (req, res) => {
  swap('categories', '1 = ?', [1], Number(req.params.id), req.body?.dir === 'up' ? 'up' : 'down');
  res.json({ ok: true });
});

// ─── МОДУЛИ ────────────────────────────────────────────────
router.get('/modules/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM modules WHERE id = ?').get(Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Модулът не е намерен.' });
  const category = db.prepare('SELECT id, title, icon FROM categories WHERE id = ?').get(m.category_id);
  const questions = db.prepare('SELECT * FROM questions WHERE module_id = ? ORDER BY order_index, id').all(m.id)
    .map((q) => ({ id: q.id, text: q.text, options: JSON.parse(q.options), correct_index: q.correct_index }));
  res.json({ module: m, category, questions });
});

router.post('/modules', (req, res) => {
  const { category_id, title, summary, content, video_url } = req.body || {};
  if (!category_id || !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(Number(category_id)))
    return res.status(400).json({ error: 'Невалидна категория.' });
  if (!title?.trim()) return res.status(400).json({ error: 'Въведи заглавие на модула.' });
  const order = nextOrder('modules', 'category_id', Number(category_id));
  const id = db.prepare('INSERT INTO modules (category_id, title, summary, content, video_url, order_index) VALUES (?, ?, ?, ?, ?, ?)')
    .run(Number(category_id), title.trim(), (summary || '').trim(), content || '', (video_url || '').trim() || null, order).lastInsertRowid;
  res.json({ id });
});

router.put('/modules/:id', (req, res) => {
  const { title, summary, content, video_url } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Въведи заглавие на модула.' });
  const info = db.prepare('UPDATE modules SET title = ?, summary = ?, content = ?, video_url = ? WHERE id = ?')
    .run(title.trim(), (summary || '').trim(), content || '', (video_url || '').trim() || null, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Модулът не е намерен.' });
  res.json({ ok: true });
});

router.delete('/modules/:id', (req, res) => {
  db.prepare('DELETE FROM modules WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.post('/modules/:id/move', (req, res) => {
  const m = db.prepare('SELECT category_id FROM modules WHERE id = ?').get(Number(req.params.id));
  if (m) swap('modules', 'category_id = ?', [m.category_id], Number(req.params.id), req.body?.dir === 'up' ? 'up' : 'down');
  res.json({ ok: true });
});

// ─── ВЪПРОСИ ───────────────────────────────────────────────
router.post('/questions', (req, res) => {
  const { module_id, text, options, correct_index } = req.body || {};
  if (!module_id || !db.prepare('SELECT 1 FROM modules WHERE id = ?').get(Number(module_id)))
    return res.status(400).json({ error: 'Невалиден модул.' });
  if (!text?.trim()) return res.status(400).json({ error: 'Въведи текст на въпроса.' });
  const opts = validOptions(options);
  if (!opts) return res.status(400).json({ error: 'Нужни са поне 2 попълнени възможни отговора.' });
  const ci = Number(correct_index);
  if (!(ci >= 0 && ci < opts.length)) return res.status(400).json({ error: 'Избери верния отговор.' });
  const order = nextOrder('questions', 'module_id', Number(module_id));
  const id = db.prepare('INSERT INTO questions (module_id, text, options, correct_index, order_index) VALUES (?, ?, ?, ?, ?)')
    .run(Number(module_id), text.trim(), JSON.stringify(opts), ci, order).lastInsertRowid;
  res.json({ id });
});

router.put('/questions/:id', (req, res) => {
  const { text, options, correct_index } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'Въведи текст на въпроса.' });
  const opts = validOptions(options);
  if (!opts) return res.status(400).json({ error: 'Нужни са поне 2 попълнени възможни отговора.' });
  const ci = Number(correct_index);
  if (!(ci >= 0 && ci < opts.length)) return res.status(400).json({ error: 'Избери верния отговор.' });
  const info = db.prepare('UPDATE questions SET text = ?, options = ?, correct_index = ? WHERE id = ?')
    .run(text.trim(), JSON.stringify(opts), ci, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Въпросът не е намерен.' });
  res.json({ ok: true });
});

router.delete('/questions/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.post('/questions/:id/move', (req, res) => {
  const q = db.prepare('SELECT module_id FROM questions WHERE id = ?').get(Number(req.params.id));
  if (q) swap('questions', 'module_id = ?', [q.module_id], Number(req.params.id), req.body?.dir === 'up' ? 'up' : 'down');
  res.json({ ok: true });
});

// ─── ИМПОРТ НА ВЪПРОСИ ОТ CSV ──────────────────────────────
// Формат на всеки ред:  Въпрос ; Отговор1 ; Отговор2 ; … ; №НаВерния
router.post('/modules/:id/import-questions', (req, res) => {
  const moduleId = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM modules WHERE id = ?').get(moduleId))
    return res.status(404).json({ error: 'Модулът не е намерен.' });

  const text = String(req.body?.text || '');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return res.status(400).json({ error: 'Няма редове за импортиране.' });

  const ins = db.prepare('INSERT INTO questions (module_id, text, options, correct_index, order_index) VALUES (?, ?, ?, ?, ?)');
  let order = nextOrder('questions', 'module_id', moduleId);
  let added = 0;
  const errors = [];

  lines.forEach((line, i) => {
    const delim = line.includes(';') ? ';' : ',';
    const parts = line.split(delim).map((p) => p.trim());
    if (parts.length < 4) { errors.push({ line: i + 1, msg: 'Нужни са въпрос + поне 2 отговора + номер на верния.' }); return; }
    const qtext = parts[0];
    const correctRaw = parts[parts.length - 1];
    const options = validOptions(parts.slice(1, -1));
    const ci = Number(correctRaw);
    if (!qtext) { errors.push({ line: i + 1, msg: 'Липсва текст на въпроса.' }); return; }
    if (!options) { errors.push({ line: i + 1, msg: 'Нужни са поне 2 попълнени отговора.' }); return; }
    if (!Number.isInteger(ci) || ci < 1 || ci > options.length) {
      errors.push({ line: i + 1, msg: `Последната колона трябва да е номер на верния отговор (1–${options.length}).` }); return;
    }
    ins.run(moduleId, qtext, JSON.stringify(options), ci - 1, order++);
    added++;
  });

  res.json({ added, total: lines.length, errors });
});

// ─── ПОТРЕБИТЕЛИ / АКАУНТИ ─────────────────────────────────
function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, store: u.store, position: u.position,
    mentor: u.mentor, start_date: u.start_date, is_mentor: u.is_mentor,
    feedback_rating: u.feedback_rating, retention_rate: u.retention_rate,
  };
}

router.get('/users', (_req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY role DESC, name').all().map(publicUser);
  res.json({ users });
});

router.post('/users', (req, res) => {
  const u = req.body || {};
  if (!u.name?.trim()) return res.status(400).json({ error: 'Въведи име.' });
  const email = String(u.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Въведи валиден имейл.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return res.status(400).json({ error: 'Вече има потребител с този имейл.' });
  if (!u.password || String(u.password).length < 6) return res.status(400).json({ error: 'Паролата трябва да е поне 6 знака.' });
  const role = u.role === 'manager' ? 'manager' : 'employee';
  const id = db.prepare(`INSERT INTO users (name, email, password_hash, role, store, position, mentor, start_date, is_mentor, feedback_rating, retention_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    u.name.trim(), email, bcrypt.hashSync(String(u.password), 10), role,
    (u.store || '').trim() || null, (u.position || '').trim() || null, (u.mentor || '').trim() || null,
    (u.start_date || '').trim() || null, u.is_mentor ? 1 : 0,
    u.feedback_rating != null && u.feedback_rating !== '' ? Number(u.feedback_rating) : null,
    u.retention_rate != null && u.retention_rate !== '' ? Number(u.retention_rate) : null,
  ).lastInsertRowid;
  res.json({ id });
});

router.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Потребителят не е намерен.' });
  const u = req.body || {};
  if (!u.name?.trim()) return res.status(400).json({ error: 'Въведи име.' });
  const email = String(u.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Въведи валиден имейл.' });
  const clash = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, id);
  if (clash) return res.status(400).json({ error: 'Друг потребител вече ползва този имейл.' });
  const role = u.role === 'manager' ? 'manager' : 'employee';

  db.prepare(`UPDATE users SET name=?, email=?, role=?, store=?, position=?, mentor=?, start_date=?, is_mentor=?, feedback_rating=?, retention_rate=? WHERE id=?`).run(
    u.name.trim(), email, role, (u.store || '').trim() || null, (u.position || '').trim() || null,
    (u.mentor || '').trim() || null, (u.start_date || '').trim() || null, u.is_mentor ? 1 : 0,
    u.feedback_rating != null && u.feedback_rating !== '' ? Number(u.feedback_rating) : null,
    u.retention_rate != null && u.retention_rate !== '' ? Number(u.retention_rate) : null, id,
  );
  // Смяна на парола – само ако е подадена нова
  if (u.password) {
    if (String(u.password).length < 6) return res.status(400).json({ error: 'Паролата трябва да е поне 6 знака.' });
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(u.password), 10), id);
  }
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Не можеш да изтриеш собствения си акаунт.' });
  const managers = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'manager'").get().n;
  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
  if (target?.role === 'manager' && managers <= 1) return res.status(400).json({ error: 'Трябва да остане поне един управител.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
