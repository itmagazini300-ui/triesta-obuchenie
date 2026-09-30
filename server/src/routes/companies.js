import { Router } from 'express';
import { requireManager } from '../auth.js';
import { db } from '../db.js';
import { getCatalog } from '../progressCalc.js';

// Фирмите и техните обекти. Само за управители.
const router = Router();
router.use(requireManager);

function readBody(body) {
  const text = (v) => String(v ?? '').trim() || null;
  return { name: text(body?.name), eik: text(body?.eik), mol: text(body?.mol), address: text(body?.address) };
}

const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

router.get('/', (_req, res) => {
  // Прогрес на служителите (без управителите), групиран по име на обект
  const byStore = new Map();
  for (const u of db.prepare("SELECT id, store FROM users WHERE role = 'employee' AND store IS NOT NULL").all()) {
    if (!byStore.has(u.store)) byStore.set(u.store, []);
    byStore.get(u.store).push(getCatalog(u.id).overall);
  }
  const stores = db.prepare('SELECT id, name, kind, address, company_id FROM stores ORDER BY order_index, name').all()
    .map((s) => ({ ...s, progress: byStore.get(s.name) || [] }));
  const group = (list) => {
    const all = list.flatMap((s) => s.progress);
    return {
      stores: list.map(({ progress, ...s }) => ({ ...s, people: progress.length, avgProgress: avg(progress) })),
      people: all.length,
      avgProgress: avg(all),
    };
  };
  const companies = db.prepare('SELECT id, name, eik, mol, address FROM companies ORDER BY order_index, name').all()
    .map((c) => ({ ...c, ...group(stores.filter((s) => s.company_id === c.id)) }));
  res.json({ companies, unassigned: group(stores.filter((s) => s.company_id == null)) });
});

router.post('/', (req, res) => {
  const v = readBody(req.body);
  if (!v.name) return res.status(400).json({ error: 'Въведи име на фирмата.' });
  if (db.prepare('SELECT 1 FROM companies WHERE name = ?').get(v.name))
    return res.status(409).json({ error: 'Вече има фирма с това име.' });
  const order = db.prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM companies').get().n;
  const id = db.prepare('INSERT INTO companies (name, eik, mol, address, order_index) VALUES (?, ?, ?, ?, ?)')
    .run(v.name, v.eik, v.mol, v.address, order).lastInsertRowid;
  res.json({ id: Number(id) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM companies WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Фирмата не е намерена.' });
  const v = readBody(req.body);
  if (!v.name) return res.status(400).json({ error: 'Въведи име на фирмата.' });
  if (db.prepare('SELECT 1 FROM companies WHERE name = ? AND id != ?').get(v.name, id))
    return res.status(409).json({ error: 'Вече има фирма с това име.' });
  db.prepare('UPDATE companies SET name = ?, eik = ?, mol = ?, address = ? WHERE id = ?').run(v.name, v.eik, v.mol, v.address, id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM companies WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Фирмата не е намерена.' });
  if (db.prepare('SELECT 1 FROM stores WHERE company_id = ?').get(id))
    return res.status(409).json({ error: 'Фирмата има обекти – първо ги премести.' });
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
