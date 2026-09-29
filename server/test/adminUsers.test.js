import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, mgr;
const base = { password: 'secret1', position: 'Продавач' };
before(async () => {
  addUser({ name: 'Упр', email: 'm@t.bg', role: 'manager' });
  srv = await startServer();
  mgr = makeClient(srv.base);
  await mgr('POST', '/auth/login', { login: 'm@t.bg', password: 'test123' });
});
after(() => srv.close());

test('служител само с име и телефон', async () => {
  const r = await mgr('POST', '/admin/users', { ...base, name: 'Нов', role: 'employee', phone: '0899 222 001', store: 'САКАР' });
  assert.equal(r.status, 200);
  const u = db.prepare('SELECT phone, email, store FROM users WHERE id = ?').get(r.data.id);
  assert.deepEqual({ ...u }, { phone: '0899222001', email: null, store: 'САКАР' });
  const list = await mgr('GET', '/admin/users');
  assert.equal(list.data.users.find((x) => x.id === r.data.id).phone, '0899222001');
});

test('служител без телефон → 400; управител без имейл → 400', async () => {
  assert.equal((await mgr('POST', '/admin/users', { ...base, name: 'А', role: 'employee' })).status, 400);
  assert.equal((await mgr('POST', '/admin/users', { ...base, name: 'Б', role: 'manager', phone: '0899222002' })).status, 400);
});

test('дублиран телефон → 400', async () => {
  const r = await mgr('POST', '/admin/users', { ...base, name: 'В', role: 'employee', phone: '+359899222001' });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /телефон/);
});

test('магазин извън списъка → 400', async () => {
  const r = await mgr('POST', '/admin/users', { ...base, name: 'Г', role: 'employee', phone: '0899222003', store: 'Магазин Люлин' });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /магазин/i);
});

test('ментор изисква стил и магазин', async () => {
  const m = { ...base, name: 'Ментор', role: 'employee', phone: '0899222004', is_mentor: 1 };
  assert.equal((await mgr('POST', '/admin/users', { ...m, store: 'МИР' })).status, 400);        // без стил
  assert.equal((await mgr('POST', '/admin/users', { ...m, mentor_style: 'D' })).status, 400);   // без магазин
  assert.equal((await mgr('POST', '/admin/users', { ...m, mentor_style: 'X', store: 'МИР' })).status, 400);
  const ok = await mgr('POST', '/admin/users', { ...m, mentor_style: 'D', store: 'МИР' });
  assert.equal(ok.status, 200);
  assert.equal(db.prepare('SELECT mentor_style FROM users WHERE id = ?').get(ok.data.id).mentor_style, 'D');
});

test('редакция: запазва телефона и сменя стила; чужд телефон → 400', async () => {
  const id = db.prepare("SELECT id FROM users WHERE name = 'Ментор'").get().id;
  const r = await mgr('PUT', `/admin/users/${id}`, { name: 'Ментор', role: 'employee', phone: '0899222004', is_mentor: 1, mentor_style: 'S', store: 'МИР' });
  assert.equal(r.status, 200);
  assert.equal(db.prepare('SELECT mentor_style FROM users WHERE id = ?').get(id).mentor_style, 'S');
  const clash = await mgr('PUT', `/admin/users/${id}`, { name: 'Ментор', role: 'employee', phone: '0899222001', is_mentor: 1, mentor_style: 'S', store: 'МИР' });
  assert.equal(clash.status, 400);
});
