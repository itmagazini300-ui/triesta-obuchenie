import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './helpers.js';
import { ensureCompanies, NINA_COMPANIES, STORE_KINDS } from '../src/companies.js';

const storeRow = (name) => db.prepare(`SELECT s.*, c.name AS company FROM stores s
  LEFT JOIN companies c ON c.id = s.company_id WHERE s.name = ?`).get(name);

test('23 фирми от файла на Нина', () => {
  assert.equal(db.prepare('SELECT COUNT(*) n FROM companies').get().n, 23);
  const p = db.prepare("SELECT * FROM companies WHERE name = '„Прогрес БГ 13“ ООД'").get();
  assert.equal(p.eik, 'BG202533515');
  assert.equal(p.mol, 'Асен Милков Миланов');
});

test('съществуващите магазини от Мистрал са закачени, без да се пипат име и № в Мистрал', () => {
  const d = storeRow('ДУБРОВНИК');
  assert.equal(d.company, '„Прогрес БГ 13“ ООД');
  assert.equal(d.location_id, 24);
  assert.equal(d.kind, 'магазин');
  assert.equal(d.address, 'ул. „Дубровник“ №4');
  assert.equal(storeRow('ГЕНЕРАЛИ').company, '„Графен Ритейл“ ЕООД');
  assert.equal(storeRow('САКАР').company, '„Крам Комерс БГ“ ЕООД');
});

test('новите обекти са създадени с верен вид', () => {
  const a = storeRow('АПТЕКА ЕВРОФАРМ');
  assert.equal(a.kind, 'аптека');
  assert.equal(a.company, '„Еврофарм БГ“ ООД');
  const sklad = storeRow('ЦЕНТРАЛЕН СКЛАД');
  assert.equal(sklad.kind, 'склад');
  assert.equal(sklad.location_id, 13);
  assert.equal(storeRow('SPA КОМПЛЕКС ИЗВОРИ').kind, 'SPA');
  assert.equal(storeRow('ПЕКАРНА ФЛОРЕНЦИЯ (ПОДВИС)').kind, 'пекарна');
});

test('еднаквите имена са различни обекти на различни фирми', () => {
  assert.equal(storeRow('МЛАДОСТ').company, '„Маджестик Груп БГ“ ЕООД');
  assert.equal(storeRow('МЛАДОСТ (СОФИЯ)').company, '„Прогрес БГ 18“ ЕООД');
  assert.equal(storeRow('БОРОВЕЦ').kind, 'магазин');
  assert.equal(storeRow('ГОСТИЛНИЦА БОРОВЕЦ').kind, 'ресторант');
});

test('магазините, които ги няма във файла, остават без фирма', () => {
  const none = db.prepare('SELECT name FROM stores WHERE company_id IS NULL ORDER BY name').all().map((r) => r.name);
  assert.deepEqual(none, ['БЕЛОСЛАВ', 'БИТОЛЯ', 'ВИНИЦА', 'ГАЛАТА', 'РОЗА', 'СОЛУН', 'ЦЕНТРАЛЕН ОФИС']);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM stores').get().n, 73);
});

test('данните във файла са последователни', () => {
  const names = NINA_COMPANIES.flatMap((c) => c.stores.map((s) => s.name));
  assert.equal(new Set(names).size, names.length, 'дублирано име на обект');
  for (const c of NINA_COMPANIES) for (const s of c.stores)
    assert.ok(STORE_KINDS.includes(s.kind ?? 'магазин'), `невалиден вид при ${s.name}`);
});

test('второ извикване не променя нищо', () => {
  db.prepare("UPDATE stores SET company_id = NULL WHERE name = 'ДУБРОВНИК'").run();
  ensureCompanies(db);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM companies').get().n, 23);
  assert.equal(storeRow('ДУБРОВНИК').company_id, null, 'ръчните промени на управителя остават');
});
