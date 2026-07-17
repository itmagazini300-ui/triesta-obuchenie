import { Router } from 'express';
import { db } from '../db.js';

// Публичен маршрут – без вход. За формата за кандидатстване (QR код).
const router = Router();

router.post('/', (req, res) => {
  const { name, phone, email, position, city, message } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Въведи име.' });
  if (!phone?.trim() && !email?.trim())
    return res.status(400).json({ error: 'Остави поне телефон или имейл за връзка.' });

  db.prepare(`INSERT INTO applications (name, phone, email, position, city, message)
              VALUES (?, ?, ?, ?, ?, ?)`).run(
    name.trim(),
    (phone || '').trim() || null,
    (email || '').trim() || null,
    (position || '').trim() || null,
    (city || '').trim() || null,
    (message || '').trim() || null,
  );
  res.json({ ok: true });
});

export default router;
