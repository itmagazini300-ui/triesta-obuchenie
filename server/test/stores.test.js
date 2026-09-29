import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, mgr;
before(async () => {
  addUser({ name: 'Упр', email: 'm@t.bg', role: 'manager', store: 'ЦЕНТРАЛЕН ОФИС' });
  addUser({ name: 'Служител Сакар', phone: '0888000001', store: 'САКАР' });
  srv = await startServer();
  mgr = makeClient(srv.base);
  assert.equal((await mgr('POST', '/auth/login', { login: 'm@t.bg', password: 'test123' })).status, 200);
});
after(() => srv.close());

test('списъкът съдържа магазините от Мистрал с брой хора', async () => {
  const { status, data } = await mgr('GET', '/admin/stores');
  assert.equal(status, 200);
  const sakar = data.stores.find((s) => s.name === 'САКАР');
  assert.equal(sakar.location_id, 50);
  assert.equal(sakar.people, 1);
});

test('добавяне; дублирано име → 409; празно име → 400', async () => {
  assert.equal((await mgr('POST', '/admin/stores', { name: 'НОВ ОБЕКТ', location_id: 70 })).status, 200);
  assert.equal((await mgr('POST', '/admin/stores', { name: 'НОВ ОБЕКТ' })).status, 409);
  assert.equal((await mgr('POST', '/admin/stores', { name: '  ' })).status, 400);
});

test('преименуване мести и хората към новото име', async () => {
  const id = db.prepare("SELECT id FROM stores WHERE name = 'САКАР'").get().id;
  assert.equal((await mgr('PUT', `/admin/stores/${id}`, { name: 'САКАР 2', location_id: 50 })).status, 200);
  assert.equal(db.prepare("SELECT store FROM users WHERE phone = '0888000001'").get().store, 'САКАР 2');
});

test('магазин с хора не се трие; празен – се трие', async () => {
  const withPeople = db.prepare("SELECT id FROM stores WHERE name = 'САКАР 2'").get().id;
  const r = await mgr('DELETE', `/admin/stores/${withPeople}`);
  assert.equal(r.status, 409);
  assert.match(r.data.error, /служители/);
  const empty = db.prepare("SELECT id FROM stores WHERE name = 'НОВ ОБЕКТ'").get().id;
  assert.equal((await mgr('DELETE', `/admin/stores/${empty}`)).status, 200);
});

test('без вход → 401', async () => {
  assert.equal((await makeClient(srv.base)('GET', '/admin/stores')).status, 401);
});
