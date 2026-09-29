import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { normalizePhone } from '../phone.js';
import { signToken, cookieOptions, COOKIE_NAME, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  const login = String(req.body?.login ?? req.body?.email ?? '').trim();
  if (!login || !password)
    return res.status(400).json({ error: 'Въведи телефон или имейл и парола.' });

  const user = findUserByLogin(login);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Грешен телефон/имейл или парола.' });

  res.cookie(COOKIE_NAME, signToken(user), cookieOptions);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Имейл, ако има „@“; иначе – телефон във всякакъв запис (0888…, +359…, с интервали).
function findUserByLogin(login) {
  if (login.includes('@')) return db.prepare('SELECT * FROM users WHERE email = ?').get(login.toLowerCase());
  const phone = normalizePhone(login);
  return phone ? db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) : null;
}

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
    store: u.store, position: u.position, mentor: u.mentor, start_date: u.start_date,
    seen_welcome: u.seen_welcome, disc_result: u.disc_result,
  };
}

export default router;
