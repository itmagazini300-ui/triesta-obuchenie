import jwt from 'jsonwebtoken';
import { db } from './db.js';

// В реален проект пази това в environment променлива.
export const JWT_SECRET = process.env.JWT_SECRET || 'triesta-obuchenie-dev-secret-2026';
export const COOKIE_NAME = 'triesta_token';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === '1', // задай COOKIE_SECURE=1 при HTTPS хостинг
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// Прикача req.user, ако има валиден токен
export function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db
        .prepare('SELECT id, name, email, role, store, position, mentor, start_date, seen_welcome, disc_result FROM users WHERE id = ?')
        .get(payload.id);
      if (user) req.user = user;
    } catch {
      /* невалиден токен – продължаваме като анонимен */
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Необходим е вход в системата.' });
  next();
}

export function requireManager(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Необходим е вход в системата.' });
  if (req.user.role !== 'manager')
    return res.status(403).json({ error: 'Тази страница е само за управители.' });
  next();
}
