import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, mgr, mentorD, mentorI;
before(async () => {
  addUser({ name: 'Упр', email: 'm@t.bg', role: 'manager' });
  mentorD = addUser({ name: 'Дим Ментор', is_mentor: 1, mentor_style: 'D', store: 'ШИПКА', phone: '0888000001' });
  mentorI = addUser({ name: 'Ива Ментор', is_mentor: 1, mentor_style: 'I', store: 'МИР', phone: '0888000002' });
  srv = await startServer();
  mgr = makeClient(srv.base);
  assert.equal((await mgr('POST', '/auth/login', { login: 'm@t.bg', password: 'test123' })).status, 200);
});
after(() => srv.close());
beforeEach(() => {
  db.exec("DELETE FROM disc_requests; DELETE FROM users WHERE role = 'employee' AND is_mentor = 0");
});

function addRequest(name, phone, style = 'D', mentorId = null) {
  return Number(db.prepare(`INSERT INTO disc_requests (name, phone, disc_result, disc_scores, suggested_mentor_id)
    VALUES (?, ?, ?, '{}', ?)`).run(name, phone, style, mentorId).lastInsertRowid);
}

test('списък и брояч на чакащите', async () => {
  addRequest('Пешо', '0899111001', 'D', mentorD);
  addRequest('Мила', '0899111002', 'I', mentorI);
  const c = await mgr('GET', '/manager/disc-requests/count');
  assert.deepEqual(c.data, { pending: 2 });
  const { data } = await mgr('GET', '/manager/disc-requests');
  assert.equal(data.pending.length, 2);
  const peso = data.pending.find((r) => r.name === 'Пешо');
  assert.equal(peso.disc_result, 'D');
  assert.equal(peso.suggested_mentor.name, 'Дим Ментор');
  assert.equal(peso.suggested_mentor.store, 'ШИПКА');
  assert.equal(data.mentors.length, 2);
});

test('предложението за чакащите се смята при четене: след одобрение остатъкът получава другия ментор', async () => {
  const mentorD2 = addUser({ name: 'Яна Ментор', is_mentor: 1, mentor_style: 'D', store: 'ИСКЪР', phone: '0888000003' });
  try {
    const a = addRequest('Първи', '0899111011', 'D', mentorD);
    const b = addRequest('Втори', '0899111012', 'D', mentorD);
    const first = (await mgr('GET', '/manager/disc-requests')).data.pending.find((r) => r.id === a);
    assert.equal(first.suggested_mentor.id, mentorD); // 0 обучаеми, по азбучен ред „Дим“ < „Яна“
    assert.equal((await mgr('POST', `/manager/disc-requests/${a}/approve`, { mentorId: first.suggested_mentor.id })).status, 200);
    const { data } = await mgr('GET', '/manager/disc-requests');
    assert.equal(data.pending.length, 1);
    assert.equal(data.pending[0].id, b);
    assert.equal(data.pending[0].suggested_mentor.id, mentorD2);
  } finally {
    db.prepare('DELETE FROM users WHERE id = ?').run(mentorD2);
  }
});

test('одобрение създава служител с телефон, ментор и магазина на ментора; входът с телефона работи', async () => {
  const id = addRequest('Пешо Петров', '0899111001', 'D', mentorD);
  const r = await mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorD });
  assert.equal(r.status, 200);
  assert.match(r.data.password, /^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);

  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(r.data.userId);
  assert.equal(u.name, 'Пешо Петров');
  assert.equal(u.phone, '0899111001');
  assert.equal(u.email, null);
  assert.equal(u.role, 'employee');
  assert.equal(u.mentor, 'Дим Ментор');
  assert.equal(u.store, 'ШИПКА');
  assert.equal(u.disc_result, 'D');
  assert.equal(u.mentorship_done_at, null);

  const req = db.prepare('SELECT * FROM disc_requests WHERE id = ?').get(id);
  assert.equal(req.status, 'approved');
  assert.equal(req.user_id, r.data.userId);

  // вход с телефона, написан по различен начин
  const emp = makeClient(srv.base);
  const login = await emp('POST', '/auth/login', { login: '+359 899 111 001', password: r.data.password });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.name, 'Пешо Петров');
  assert.equal(login.data.user.phone, '0899111001');
});

test('управителят може да избере друг ментор', async () => {
  const id = addRequest('Пешо', '0899111001', 'D', mentorD);
  const r = await mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorI });
  const u = db.prepare('SELECT mentor, store FROM users WHERE id = ?').get(r.data.userId);
  assert.deepEqual({ ...u }, { mentor: 'Ива Ментор', store: 'МИР' });
});

test('заявка без предложение се одобрява с ментор по избор; без ментор → 400', async () => {
  const id = addRequest('Васил', '0899111003', 'C', null);
  assert.equal((await mgr('POST', `/manager/disc-requests/${id}/approve`, {})).status, 400);
  assert.equal((await mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: 99999 })).status, 400);
  assert.equal((await mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorI })).status, 200);
});

test('двойно одобрение → 409 и само един акаунт', async () => {
  const id = addRequest('Пешо', '0899111001', 'D', mentorD);
  const [a, b] = await Promise.all([
    mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorD }),
    mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorD }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE phone = '0899111001'").get().n, 1);
});

test('телефонът междувременно е зает → 409, заявката остава чакаща', async () => {
  const id = addRequest('Пешо', '0899111001', 'D', mentorD);
  addUser({ name: 'Друг', phone: '0899111001' });
  const r = await mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorD });
  assert.equal(r.status, 409);
  assert.equal(db.prepare('SELECT status FROM disc_requests WHERE id = ?').get(id).status, 'pending');
});

test('отказ: статус rejected, без акаунт; вторият отказ → 409; несъществуваща → 404', async () => {
  const id = addRequest('Пешо', '0899111001', 'D', mentorD);
  assert.equal((await mgr('POST', `/manager/disc-requests/${id}/reject`)).status, 200);
  assert.equal(db.prepare('SELECT status FROM disc_requests WHERE id = ?').get(id).status, 'rejected');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE phone = '0899111001'").get().n, 0);
  assert.equal((await mgr('POST', `/manager/disc-requests/${id}/reject`)).status, 409);
  assert.equal((await mgr('POST', '/manager/disc-requests/99999/reject')).status, 404);
  const { data } = await mgr('GET', '/manager/disc-requests');
  assert.equal(data.history[0].status, 'rejected');
});

test('служител няма достъп → 403', async () => {
  const id = addRequest('Пешо', '0899111001', 'D', mentorD);
  const r = await mgr('POST', `/manager/disc-requests/${id}/approve`, { mentorId: mentorD });
  const emp = makeClient(srv.base);
  await emp('POST', '/auth/login', { login: '0899111001', password: r.data.password });
  assert.equal((await emp('GET', '/manager/disc-requests')).status, 403);
});

test('грешен телефон или парола → 401; имейл входът още работи', async () => {
  assert.equal((await makeClient(srv.base)('POST', '/auth/login', { login: '0899000000', password: 'x' })).status, 401);
  assert.equal((await makeClient(srv.base)('POST', '/auth/login', { login: 'нещо', password: 'x' })).status, 401);
  assert.equal((await makeClient(srv.base)('POST', '/auth/login', { email: 'm@t.bg', password: 'test123' })).status, 200);
});
