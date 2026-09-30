import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, mgr;
before(async () => {
  addUser({ name: 'Упр', email: 'm@t.bg', role: 'manager', store: 'ДУБРОВНИК' });
  const e = addUser({ name: 'Служител Дубровник', phone: '0888000001', store: 'ДУБРОВНИК' });
  addUser({ name: 'Служител Подвис', phone: '0888000002', store: 'ПОДВИС' });
  // Служителят от Дубровник е завършил единствения модул → 100%
  db.exec("INSERT INTO categories (id, slug, title, icon) VALUES (1, 'c', 'К', 'store')");
  db.exec("INSERT INTO modules (id, category_id, title) VALUES (1, 1, 'М')");
  db.prepare("INSERT INTO progress (user_id, module_id, status, score) VALUES (?, 1, 'completed', 100)").run(e);
  srv = await startServer();
  mgr = makeClient(srv.base);
  assert.equal((await mgr('POST', '/auth/login', { login: 'm@t.bg', password: 'test123' })).status, 200);
});
after(() => srv.close());

test('обобщение: фирма → обекти, служители и среден прогрес (без управителите)', async () => {
  const { status, data } = await mgr('GET', '/admin/companies');
  assert.equal(status, 200);
  const p = data.companies.find((c) => c.name === '„Прогрес БГ 13“ ООД');
  assert.equal(p.eik, 'BG202533515');
  assert.equal(p.people, 2);
  assert.equal(p.avgProgress, 50);
  const dub = p.stores.find((s) => s.name === 'ДУБРОВНИК');
  assert.deepEqual([dub.people, dub.avgProgress, dub.kind], [1, 100, 'магазин']);
  const izvori = p.stores.find((s) => s.name === 'РЕСТОРАНТ ИЗВОРИ');
  assert.deepEqual([izvori.people, izvori.avgProgress], [0, 0]);
  assert.ok(data.unassigned.stores.some((s) => s.name === 'СОЛУН'));
  assert.equal(data.unassigned.people, 0);
});

test('добавяне, дублирано име → 409, празно име → 400', async () => {
  const r = await mgr('POST', '/admin/companies', { name: 'Нова Фирма ЕООД', eik: 'BG1', mol: 'Иван' });
  assert.equal(r.status, 200);
  assert.ok(r.data.id);
  assert.equal((await mgr('POST', '/admin/companies', { name: 'Нова Фирма ЕООД' })).status, 409);
  assert.equal((await mgr('POST', '/admin/companies', { name: '  ' })).status, 400);
});

test('редакция; дублирано име → 409; липсваща фирма → 404', async () => {
  const id = db.prepare("SELECT id FROM companies WHERE name = 'Нова Фирма ЕООД'").get().id;
  assert.equal((await mgr('PUT', `/admin/companies/${id}`, { name: 'Нова Фирма 2 ЕООД', mol: 'Петър' })).status, 200);
  assert.equal(db.prepare('SELECT mol FROM companies WHERE id = ?').get(id).mol, 'Петър');
  assert.equal((await mgr('PUT', `/admin/companies/${id}`, { name: '„Персика“ ЕООД' })).status, 409);
  assert.equal((await mgr('PUT', '/admin/companies/99999', { name: 'Х' })).status, 404);
});

test('фирма с обекти не се трие; без обекти – се трие', async () => {
  const withStores = db.prepare("SELECT id FROM companies WHERE name = '„Персика“ ЕООД'").get().id;
  const r = await mgr('DELETE', `/admin/companies/${withStores}`);
  assert.equal(r.status, 409);
  assert.match(r.data.error, /обекти/);
  const empty = db.prepare("SELECT id FROM companies WHERE name = '„Примера М“ ЕООД'").get().id;
  assert.equal((await mgr('DELETE', `/admin/companies/${empty}`)).status, 200);
  assert.equal(db.prepare('SELECT 1 FROM companies WHERE id = ?').get(empty), undefined);
});

test('без вход → 401', async () => {
  assert.equal((await makeClient(srv.base)('GET', '/admin/companies')).status, 401);
});
