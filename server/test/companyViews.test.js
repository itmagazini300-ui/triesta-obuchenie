import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, makeClient, addUser, db } from './helpers.js';

let srv, mgr, dubId;
const PROGRES = '„Прогрес БГ 13“ ООД';
before(async () => {
  addUser({ name: 'Упр', email: 'm@t.bg', role: 'manager', store: 'ЦЕНТРАЛЕН ОФИС' });
  addUser({ name: 'Ментор Дубровник', phone: '0888000009', store: 'ДУБРОВНИК', is_mentor: 1, mentor_style: 'D' });
  dubId = addUser({ name: 'А Дубровник', phone: '0888000001', store: 'ДУБРОВНИК', mentor: 'Ментор Дубровник' });
  addUser({ name: 'Б Подвис', phone: '0888000002', store: 'ПОДВИС' });
  addUser({ name: 'В Сакар', phone: '0888000003', store: 'САКАР' });
  addUser({ name: 'Г Солун', phone: '0888000004', store: 'СОЛУН' });
  addUser({ name: 'Д Люлин', phone: '0888000005', store: 'Магазин Люлин' }); // стар, непознат магазин
  db.exec("INSERT INTO categories (id, slug, title, icon) VALUES (1, 'c', 'К', 'store')");
  db.exec("INSERT INTO modules (id, category_id, title) VALUES (1, 1, 'М')");
  db.prepare("INSERT INTO progress (user_id, module_id, status, score) VALUES (?, 1, 'completed', 100)").run(dubId);
  db.exec("INSERT INTO disc_requests (name, phone, disc_result) VALUES ('Кандидат', '0888000099', 'D')");
  srv = await startServer();
  mgr = makeClient(srv.base);
  assert.equal((await mgr('POST', '/auth/login', { login: 'm@t.bg', password: 'test123' })).status, 200);
});
after(() => srv.close());

const names = (d) => d.employees.map((e) => e.name).sort();

test('таблото без филтър показва фирмата на всеки служител', async () => {
  const { data } = await mgr('GET', '/manager/overview');
  assert.equal(data.stats.total, 6);
  const byName = Object.fromEntries(data.employees.map((e) => [e.name, e.company]));
  assert.equal(byName['А Дубровник'], PROGRES);
  assert.equal(byName['В Сакар'], '„Крам Комерс БГ“ ЕООД');
  assert.equal(byName['Г Солун'], null);
  assert.equal(byName['Д Люлин'], null);
});

test('филтър по фирма – статистиката е само за нея', async () => {
  const cid = db.prepare('SELECT id FROM companies WHERE name = ?').get(PROGRES).id;
  const { data } = await mgr('GET', `/manager/overview?company=${cid}`);
  assert.deepEqual(names(data), ['Ментор Дубровник', 'А Дубровник', 'Б Подвис'].sort());
  assert.equal(data.stats.total, 3);
  assert.equal(data.stats.avgProgress, 33);
  assert.equal(data.stats.fullyTrained, 1);
});

test('филтър „без фирма“ хваща и непознатите магазини', async () => {
  const { data } = await mgr('GET', '/manager/overview?company=none');
  assert.deepEqual(names(data), ['Г Солун', 'Д Люлин']);
});

test('филтър по обект', async () => {
  const { data } = await mgr('GET', `/manager/overview?store=${encodeURIComponent('САКАР')}`);
  assert.deepEqual(names(data), ['В Сакар']);
  assert.equal(data.stats.avgProgress, 0);
});

test('фирмата се вижда в детайла, при менторите и в заявките', async () => {
  const emp = await mgr('GET', `/manager/employees/${dubId}`);
  assert.equal(emp.data.employee.company, PROGRES);

  const m = (await mgr('GET', '/manager/mentors')).data.mentors.find((x) => x.name === 'Ментор Дубровник');
  assert.equal(m.company, PROGRES);
  assert.equal(m.activeList[0].company, PROGRES);

  const reqs = (await mgr('GET', '/manager/disc-requests')).data;
  assert.equal(reqs.pending[0].suggested_mentor.company, PROGRES);
  assert.equal(reqs.mentors.find((x) => x.name === 'Ментор Дубровник').company, PROGRES);
});
