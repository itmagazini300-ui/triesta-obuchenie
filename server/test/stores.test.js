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

test('списъкът показва фирма, вид и адрес + списъка с видове', async () => {
  const { data } = await mgr('GET', '/admin/stores');
  const d = data.stores.find((s) => s.name === 'ДУБРОВНИК');
  assert.equal(d.company_name, '„Прогрес БГ 13“ ООД');
  assert.equal(d.kind, 'магазин');
  assert.equal(d.address, 'ул. „Дубровник“ №4');
  assert.ok(data.kinds.includes('пекарна'));
});

test('нов обект с фирма, вид и адрес', async () => {
  const cid = db.prepare("SELECT id FROM companies WHERE name = '„Клас Комерс БГ“ ООД'").get().id;
  const r = await mgr('POST', '/admin/stores', { name: 'ПЕКАРНА НОВА', company_id: cid, kind: 'пекарна', address: 'ул. „Нова“ 1' });
  assert.equal(r.status, 200);
  const s = db.prepare("SELECT * FROM stores WHERE name = 'ПЕКАРНА НОВА'").get();
  assert.deepEqual([s.company_id, s.kind, s.address], [cid, 'пекарна', 'ул. „Нова“ 1']);
});

test('преименуване без другите полета запазва фирмата, вида и адреса', async () => {
  const s = db.prepare("SELECT * FROM stores WHERE name = 'ПЕКАРНА НОВА'").get();
  assert.equal((await mgr('PUT', `/admin/stores/${s.id}`, { name: 'ПЕКАРНА НОВА 2' })).status, 200);
  const after = db.prepare('SELECT * FROM stores WHERE id = ?').get(s.id);
  assert.deepEqual([after.name, after.company_id, after.kind, after.address], ['ПЕКАРНА НОВА 2', s.company_id, 'пекарна', 'ул. „Нова“ 1']);
});

test('преместване на обект към „без фирма“', async () => {
  const s = db.prepare("SELECT id FROM stores WHERE name = 'ПЕКАРНА НОВА 2'").get();
  assert.equal((await mgr('PUT', `/admin/stores/${s.id}`, { company_id: '' })).status, 200);
  assert.equal(db.prepare('SELECT company_id FROM stores WHERE id = ?').get(s.id).company_id, null);
});

test('невалидна фирма или вид → 400', async () => {
  const s = db.prepare("SELECT id FROM stores WHERE name = 'ПЕКАРНА НОВА 2'").get();
  for (const body of [{ company_id: 99999 }, { company_id: 'абв' }, { kind: 'космодрум' }]) {
    const r = await mgr('PUT', `/admin/stores/${s.id}`, body);
    assert.equal(r.status, 400, JSON.stringify(body));
  }
  assert.equal((await mgr('POST', '/admin/stores', { name: 'Х', kind: 'космодрум' })).status, 400);
});
