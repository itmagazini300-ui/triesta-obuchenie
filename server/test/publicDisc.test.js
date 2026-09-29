import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, call;
before(async () => { srv = await startServer(); call = makeClient(srv.base); });
after(() => srv.close());
beforeEach(() => { db.exec('DELETE FROM disc_requests; DELETE FROM users'); });

// Индекс 0 е доминантният отговор във всеки въпрос → резултат D
const allFirst = () => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]));

test('въпросите се връщат без стил', async () => {
  const { status, data } = await call('GET', '/public/disc');
  assert.equal(status, 200);
  assert.equal(data.questions.length, 12);
  assert.equal(data.questions[0].options.length, 4);
  assert.ok(!JSON.stringify(data).includes('"style"'));
});

test('заявка: записва стила и предложения ментор, но не ги връща', async () => {
  const mid = addUser({ name: 'Доминантен Ментор', is_mentor: 1, mentor_style: 'D', store: 'ШИПКА', phone: '0888000001' });
  const r = await call('POST', '/public/disc', { name: ' Пешо ', phone: '+359 899 111 001', answers: allFirst() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { ok: true });
  const row = db.prepare('SELECT * FROM disc_requests').get();
  assert.equal(row.name, 'Пешо');
  assert.equal(row.phone, '0899111001');
  assert.equal(row.disc_result, 'D');
  assert.equal(row.suggested_mentor_id, mid);
  assert.equal(row.status, 'pending');
  assert.equal(JSON.parse(row.disc_scores).D, 12);
});

test('без ментор с този стил → заявката се записва без предложение', async () => {
  const r = await call('POST', '/public/disc', { name: 'Мила', phone: '0899111002', answers: allFirst() });
  assert.equal(r.status, 200);
  assert.equal(db.prepare('SELECT suggested_mentor_id FROM disc_requests').get().suggested_mentor_id, null);
});

test('повторна заявка със същия телефон (друг запис) → 409', async () => {
  await call('POST', '/public/disc', { name: 'Пешо', phone: '0899111001', answers: allFirst() });
  const r = await call('POST', '/public/disc', { name: 'Пешо', phone: '0899 111 001', answers: allFirst() });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /Вече имате подадена заявка/);
  assert.equal((await call('POST', '/public/disc/check', { phone: '+359899111001' })).status, 409);
});

test('телефон, който вече е на служител → 409', async () => {
  addUser({ name: 'Служител', phone: '0899111003' });
  assert.equal((await call('POST', '/public/disc/check', { phone: '0899111003' })).status, 409);
  assert.equal((await call('POST', '/public/disc', { name: 'X', phone: '0899111003', answers: allFirst() })).status, 409);
});

test('отказана заявка не пречи на нова', async () => {
  db.prepare("INSERT INTO disc_requests (name, phone, disc_result, status) VALUES ('Стар', '0899111004', 'S', 'rejected')").run();
  assert.equal((await call('POST', '/public/disc/check', { phone: '0899111004' })).status, 200);
});

test('валидации → 400', async () => {
  assert.equal((await call('POST', '/public/disc', { name: '', phone: '0899111005', answers: allFirst() })).status, 400);
  assert.equal((await call('POST', '/public/disc', { name: 'А', phone: '123', answers: allFirst() })).status, 400);
  const partial = allFirst(); delete partial[12];
  assert.equal((await call('POST', '/public/disc', { name: 'А', phone: '0899111005', answers: partial })).status, 400);
  assert.equal((await call('POST', '/public/disc', { name: 'А', phone: '0899111005', answers: { ...allFirst(), 3: 9 } })).status, 400);
  assert.equal((await call('POST', '/public/disc/check', { phone: 'abc' })).status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM disc_requests').get().n, 0);
});
