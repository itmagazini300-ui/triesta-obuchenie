import { Router } from 'express';
import { requireManager } from '../auth.js';
import { db } from '../db.js';
import { STORE_KINDS } from '../companies.js';

// Списък с магазините (обектите от Мистрал). Само за управители.
const router = Router();
router.use(requireManager);

export function storeExists(name) {
  return !!db.prepare('SELECT 1 FROM stores WHERE name = ?').get(name);
}

// При редакция (old) липсващо поле запазва старата стойност.
function readBody(body, old = {}) {
  const has = (k) => body != null && Object.prototype.hasOwnProperty.call(body, k);
  const pick = (k, fallback) => (has(k) ? body[k] : old[k] ?? fallback);
  const toId = (v) => (v === '' || v == null ? null : Number(v));
  const location_id = toId(pick('location_id', null));
  return {
    name: String(pick('name', '')).trim(),
    location_id: Number.isFinite(location_id) ? location_id : null,
    company_id: toId(pick('company_id', null)),
    kind: String(pick('kind', 'магазин')).trim(),
    address: String(pick('address', '') ?? '').trim() || null,
  };
}

function invalid(v) {
  if (!v.name) return 'Въведи име на магазина.';
  if (!STORE_KINDS.includes(v.kind)) return 'Избери вид на обекта от списъка.';
  if (v.company_id != null && (!Number.isInteger(v.company_id) || !db.prepare('SELECT 1 FROM companies WHERE id = ?').get(v.company_id)))
    return 'Избери фирма от списъка.';
  return null;
}

router.get('/', (_req, res) => {
  const stores = db.prepare(`
    SELECT s.id, s.name, s.location_id, s.company_id, c.name AS company_name, s.kind, s.address,
      (SELECT COUNT(*) FROM users u WHERE u.store = s.name) AS people
    FROM stores s LEFT JOIN companies c ON c.id = s.company_id
    ORDER BY s.order_index, s.name`).all();
  res.json({ stores, kinds: STORE_KINDS });
});

router.post('/', (req, res) => {
  const v = readBody(req.body);
  const error = invalid(v);
  if (error) return res.status(400).json({ error });
  if (storeExists(v.name)) return res.status(409).json({ error: 'Вече има магазин с това име.' });
  const order = db.prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM stores').get().n;
  const id = db.prepare('INSERT INTO stores (name, location_id, order_index, company_id, kind, address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(v.name, v.location_id, order, v.company_id, v.kind, v.address).lastInsertRowid;
  res.json({ id: Number(id) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: 'Магазинът не е намерен.' });
  const v = readBody(req.body, old);
  const error = invalid(v);
  if (error) return res.status(400).json({ error });
  if (db.prepare('SELECT 1 FROM stores WHERE name = ? AND id != ?').get(v.name, id))
    return res.status(409).json({ error: 'Вече има магазин с това име.' });
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE stores SET name = ?, location_id = ?, company_id = ?, kind = ?, address = ? WHERE id = ?')
      .run(v.name, v.location_id, v.company_id, v.kind, v.address, id);
    db.prepare('UPDATE users SET store = ? WHERE store = ?').run(v.name, old.name);
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
