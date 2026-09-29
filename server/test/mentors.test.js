import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, mgr, peso;
before(async () => {
  addUser({ name: 'Упр', email: 'm@t.bg', role: 'manager' });
  addUser({ name: 'Дим Ментор', is_mentor: 1, mentor_style: 'D', store: 'ШИПКА', phone: '0888000001' });
  peso = addUser({ name: 'Пешо', mentor: 'Дим Ментор', store: 'ШИПКА', phone: '0899111001' });
  addUser({ name: 'Стар', mentor: 'Дим Ментор', mentorship_done_at: '2026-05-01 10:00:00', phone: '0899111002' });
  srv = await startServer();
  mgr = makeClient(srv.base);
  await mgr('POST', '/auth/login', { login: 'm@t.bg', password: 'test123' });
});
after(() => srv.close());

test('менторът показва стил, магазин, активни и завършили', async () => {
  const { data } = await mgr('GET', '/manager/mentors');
  const m = data.mentors.find((x) => x.name === 'Дим Ментор');
  assert.equal(m.mentor_style, 'D');
  assert.equal(m.store, 'ШИПКА');
  assert.equal(m.active, 1);
  assert.deepEqual(m.activeList.map((x) => x.name), ['Пешо']);
  assert.deepEqual(m.doneList.map((x) => x.name), ['Стар']);
  assert.equal(m.mentees, 2); // KPI – както досега, върху всички
  assert.equal(data.stats.totalActive, 1);
});

test('„Завършил" маха човека от активните; повторно → 409; непознат → 404', async () => {
  assert.equal((await mgr('POST', `/manager/mentees/${peso}/complete`)).status, 200);
  assert.ok(db.prepare('SELECT mentorship_done_at FROM users WHERE id = ?').get(peso).mentorship_done_at);
  const { data } = await mgr('GET', '/manager/mentors');
  const m = data.mentors.find((x) => x.name === 'Дим Ментор');
  assert.equal(m.active, 0);
  assert.equal(m.doneList.length, 2);
  assert.equal((await mgr('POST', `/manager/mentees/${peso}/complete`)).status, 409);
  assert.equal((await mgr('POST', '/manager/mentees/99999/complete')).status, 404);
});
