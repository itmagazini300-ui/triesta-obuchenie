import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { requireManager } from '../auth.js';
import { db } from '../db.js';
import { listMentors, activeMenteeCount, suggestMentor } from '../mentorMatch.js';

// Заявки от публичния DISC тест – чакат одобрение от управителя.
const router = Router();
router.use(requireManager);

// Без объркващи знаци (0/O, 1/l/I), за да се продиктува лесно.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function genPassword() {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

function view(r) {
  // Чакащите: предложението се смята при четене (натоварването се променя след всяко одобрение).
  // Историята пази записаното при подаването.
  let m;
  if (r.status === 'pending') {
    const s = suggestMentor(r.disc_result);
    m = s ? { id: s.id, name: s.name, store: s.store, mentor_style: s.mentor_style } : null;
  } else {
    m = r.suggested_mentor_id
      ? db.prepare('SELECT id, name, store, mentor_style FROM users WHERE id = ? AND is_mentor = 1').get(r.suggested_mentor_id)
      : null;
  }
  return {
    id: r.id, name: r.name, phone: r.phone, disc_result: r.disc_result, created_at: r.created_at,
    status: r.status, decided_at: r.decided_at, user_id: r.user_id,
    suggested_mentor: m ? { ...m, active: activeMenteeCount(m.name) } : null,
  };
}

router.get('/', (_req, res) => {
  const pending = db.prepare("SELECT * FROM disc_requests WHERE status = 'pending' ORDER BY created_at, id").all().map(view);
  const history = db.prepare("SELECT * FROM disc_requests WHERE status != 'pending' ORDER BY decided_at DESC, id DESC LIMIT 50").all().map(view);
  res.json({ pending, history, mentors: listMentors() });
});

router.get('/count', (_req, res) => {
  res.json({ pending: db.prepare("SELECT COUNT(*) n FROM disc_requests WHERE status = 'pending'").get().n });
});

router.post('/:id/approve', (req, res) => {
  const r = db.prepare('SELECT * FROM disc_requests WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Заявката не е намерена.' });
  if (r.status !== 'pending') return res.status(409).json({ error: 'Заявката вече е обработена.' });
  const mentor = db.prepare('SELECT id, name, store FROM users WHERE id = ? AND is_mentor = 1').get(Number(req.body?.mentorId));
  if (!mentor) return res.status(400).json({ error: 'Избери ментор.' });
  if (db.prepare('SELECT 1 FROM users WHERE phone = ?').get(r.phone))
    return res.status(409).json({ error: 'Вече има служител с този телефон.' });

  const password = genPassword();
  const hash = bcrypt.hashSync(password, 10);
  let userId;
  db.exec('BEGIN IMMEDIATE');
  try {
    // повторна проверка вътре в транзакцията – срещу двоен клик
    const claimed = db.prepare("UPDATE disc_requests SET status = 'approved', decided_at = datetime('now') WHERE id = ? AND status = 'pending'").run(r.id);
    if (claimed.changes !== 1) { db.exec('ROLLBACK'); return res.status(409).json({ error: 'Заявката вече е обработена.' }); }
    userId = Number(db.prepare(`INSERT INTO users (name, email, phone, password_hash, role, store, mentor, start_date, disc_result, disc_taken_at)
      VALUES (?, NULL, ?, ?, 'employee', ?, ?, date('now'), ?, ?)`)
      .run(r.name, r.phone, hash, mentor.store, mentor.name, r.disc_result, r.created_at).lastInsertRowid);
    db.prepare('UPDATE disc_requests SET user_id = ? WHERE id = ?').run(userId, r.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  res.json({ userId, name: r.name, phone: r.phone, password });
});

router.post('/:id/reject', (req, res) => {
  const r = db.prepare('SELECT * FROM disc_requests WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Заявката не е намерена.' });
  const done = db.prepare("UPDATE disc_requests SET status = 'rejected', decided_at = datetime('now') WHERE id = ? AND status = 'pending'").run(r.id);
  if (done.changes !== 1) return res.status(409).json({ error: 'Заявката вече е обработена.' });
  res.json({ ok: true });
});

export default router;
