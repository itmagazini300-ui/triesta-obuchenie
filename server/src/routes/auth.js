import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, cookieOptions, COOKIE_NAME, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Въведи имейл и парола.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Грешен имейл или парола.' });

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

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    store: u.store, position: u.position, mentor: u.mentor, start_date: u.start_date,
    seen_welcome: u.seen_welcome, disc_result: u.disc_result,
  };
}

export default router;
