import { Router } from 'express';
import { requireManager } from '../auth.js';
import { db } from '../db.js';

// Списък с магазините (обектите от Мистрал). Само за управители.
const router = Router();
router.use(requireManager);

export function storeExists(name) {
  return !!db.prepare('SELECT 1 FROM stores WHERE name = ?').get(name);
}

function readBody(body) {
  const name = String(body?.name || '').trim();
  const loc = body?.location_id;
  const location_id = loc === '' || loc == null ? null : Number(loc);
  return { name, location_id: Number.isFinite(location_id) ? location_id : null };
}

router.get('/', (_req, res) => {
  const stores = db.prepare(`
    SELECT s.id, s.name, s.location_id, (SELECT COUNT(*) FROM users u WHERE u.store = s.name) AS people
    FROM stores s ORDER BY s.order_index, s.name`).all();
  res.json({ stores });
});

router.post('/', (req, res) => {
  const { name, location_id } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'Въведи име на магазина.' });
  if (storeExists(name)) return res.status(409).json({ error: 'Вече има магазин с това име.' });
  const order = db.prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM stores').get().n;
  const id = db.prepare('INSERT INTO stores (name, location_id, order_index) VALUES (?, ?, ?)').run(name, location_id, order).lastInsertRowid;
  res.json({ id: Number(id) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: 'Магазинът не е намерен.' });
  const { name, location_id } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'Въведи име на магазина.' });
  if (db.prepare('SELECT 1 FROM stores WHERE name = ? AND id != ?').get(name, id))
    return res.status(409).json({ error: 'Вече има магазин с това име.' });
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE stores SET name = ?, location_id = ? WHERE id = ?').run(name, location_id, id);
    db.prepare('UPDATE users SET store = ? WHERE store = ?').run(name, old.name);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM stores WHERE id = ?').get(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Магазинът не е намерен.' });
  if (db.prepare('SELECT 1 FROM users WHERE store = ?').get(s.name))
    return res.status(409).json({ error: 'Магазинът има служители – първо ги премести.' });
  db.prepare('DELETE FROM stores WHERE id = ?').run(s.id);
  res.json({ ok: true });
});

export default router;
