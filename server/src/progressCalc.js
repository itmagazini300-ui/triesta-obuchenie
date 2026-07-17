import { db } from './db.js';
import { levelFor } from './levels.js';

const PASS_SCORE = 80; // минимален % за преминаване на тест

// Стойност на модула за прогреса: завършен = 1, в процес = 0.5, незапочнат = 0
function moduleValue(status) {
  if (status === 'completed') return 1;
  if (status === 'in_progress') return 0.5;
  return 0;
}

// Връща целия каталог за конкретен потребител с изчислен прогрес.
export function getCatalog(userId) {
  const categories = db.prepare('SELECT * FROM categories ORDER BY order_index, id').all();
  const modules = db.prepare('SELECT * FROM modules ORDER BY order_index, id').all();
  const progressRows = db.prepare('SELECT module_id, status, score, completed_at FROM progress WHERE user_id = ?').all(userId);
  const progById = new Map(progressRows.map((p) => [p.module_id, p]));

  let totalVal = 0;
  let totalModules = 0;
  let completedModules = 0;

  const cats = categories.map((cat) => {
    const mods = modules
      .filter((m) => m.category_id === cat.id)
      .map((m) => {
        const p = progById.get(m.id) || { status: 'not_started', score: null };
        return {
          id: m.id, title: m.title, summary: m.summary,
          order_index: m.order_index,
          status: p.status, score: p.score ?? null,
          completed_at: p.completed_at ?? null,
        };
      });

    // Последователно отключване: първият модул е отключен, всеки следващ –
    // само след като предишният е завършен.
    let prevCompleted = true;
    mods.forEach((mm) => {
      mm.locked = !prevCompleted;
      prevCompleted = mm.status === 'completed';
    });

    const catVal = mods.reduce((s, m) => s + moduleValue(m.status), 0);
    const done = mods.filter((m) => m.status === 'completed').length;
    const percent = mods.length ? Math.round((catVal / mods.length) * 100) : 0;

    totalVal += catVal;
    totalModules += mods.length;
    completedModules += done;

    return {
      id: cat.id, slug: cat.slug, title: cat.title, icon: cat.icon,
      description: cat.description,
      modules: mods,
      moduleCount: mods.length,
      completedCount: done,
      percent,
      completed: mods.length > 0 && done === mods.length,
    };
  });

  const overall = totalModules ? Math.round((totalVal / totalModules) * 100) : 0;
  const level = levelFor(overall);

  return {
    categories: cats,
    overall,
    level: level.name,
    levelKey: level.key,
    totalModules,
    completedModules,
    completedCategories: cats.filter((c) => c.completed).length,
    totalCategories: cats.length,
  };
}

// Един модул + въпросите му (без верните отговори).
export function getModule(userId, moduleId) {
  const m = db.prepare('SELECT * FROM modules WHERE id = ?').get(moduleId);
  if (!m) return null;
  const category = db.prepare('SELECT id, slug, title, icon FROM categories WHERE id = ?').get(m.category_id);
  const questions = db
    .prepare('SELECT id, text, options FROM questions WHERE module_id = ? ORDER BY order_index, id')
    .all(moduleId)
    .map((q) => ({ id: q.id, text: q.text, options: JSON.parse(q.options) }));
  const p = db.prepare('SELECT status, score, completed_at FROM progress WHERE user_id = ? AND module_id = ?').get(userId, moduleId);

  // подредба вътре в категорията – за "следващ модул" и заключване
  const siblings = db.prepare('SELECT id FROM modules WHERE category_id = ? ORDER BY order_index, id').all(m.category_id);
  const idx = siblings.findIndex((s) => s.id === m.id);
  const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;

  // Заключен ли е: ако не е първи и предишният не е завършен.
  let locked = false;
  if (idx > 0) {
    const prevStatus = db.prepare('SELECT status FROM progress WHERE user_id = ? AND module_id = ?').get(userId, siblings[idx - 1].id);
    locked = prevStatus?.status !== 'completed';
  }

  return {
    id: m.id, title: m.title, summary: m.summary, content: m.content, video_url: m.video_url,
    category,
    questions,
    passScore: PASS_SCORE,
    status: p?.status || 'not_started',
    score: p?.score ?? null,
    completed_at: p?.completed_at ?? null,
    nextModuleId: nextId,
    locked,
  };
}

// Заключен ли е модулът за този потребител (за защита на сървъра).
export function moduleLocked(userId, moduleId) {
  const m = db.prepare('SELECT category_id FROM modules WHERE id = ?').get(moduleId);
  if (!m) return false;
  const sibs = db.prepare('SELECT id FROM modules WHERE category_id = ? ORDER BY order_index, id').all(m.category_id);
  const idx = sibs.findIndex((s) => s.id === Number(moduleId));
  if (idx <= 0) return false;
  const prev = db.prepare('SELECT status FROM progress WHERE user_id = ? AND module_id = ?').get(userId, sibs[idx - 1].id);
  return prev?.status !== 'completed';
}

// Отбелязва модула като "в процес" при отваряне (ако още не е завършен).
export function markOpened(userId, moduleId) {
  const existing = db.prepare('SELECT status FROM progress WHERE user_id = ? AND module_id = ?').get(userId, moduleId);
  if (existing?.status === 'completed') return;
  db.prepare(`
    INSERT INTO progress (user_id, module_id, status, updated_at)
    VALUES (?, ?, 'in_progress', datetime('now'))
    ON CONFLICT(user_id, module_id) DO UPDATE SET status='in_progress', updated_at=datetime('now')
  `).run(userId, moduleId);
}

// Оценява подадените отговори и записва резултата.
export function submitTest(userId, moduleId, answers) {
  const questions = db.prepare('SELECT id, correct_index FROM questions WHERE module_id = ? ORDER BY order_index, id').all(moduleId);
  if (questions.length === 0) return { error: 'Този модул няма тест.' };

  let correct = 0;
  const review = questions.map((q) => {
    const given = answers?.[q.id];
    const ok = Number(given) === q.correct_index;
    if (ok) correct++;
    return { questionId: q.id, correctIndex: q.correct_index, correct: ok };
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= PASS_SCORE;

  // Пазим само най-добрия резултат; завършваме при преминаване.
  const prev = db.prepare('SELECT status, score FROM progress WHERE user_id = ? AND module_id = ?').get(userId, moduleId);
  const bestScore = Math.max(score, prev?.score ?? 0);
  const status = passed || prev?.status === 'completed' ? 'completed' : 'in_progress';
  const completedAt = status === 'completed' ? (prev?.status === 'completed' ? undefined : "datetime('now')") : null;

  db.prepare(`
    INSERT INTO progress (user_id, module_id, status, score, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ${status === 'completed' ? "datetime('now')" : 'NULL'}, datetime('now'))
    ON CONFLICT(user_id, module_id) DO UPDATE SET
      status=excluded.status,
      score=?,
      completed_at=COALESCE(progress.completed_at, excluded.completed_at),
      updated_at=datetime('now')
  `).run(userId, moduleId, status, bestScore, bestScore);

  return {
    score, passed, passScore: PASS_SCORE,
    correct, total: questions.length,
    review,
  };
}

export { PASS_SCORE };
