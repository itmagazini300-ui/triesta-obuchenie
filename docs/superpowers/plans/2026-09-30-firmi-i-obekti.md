# Фирми и обекти — план за изпълнение

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Всеки обект (магазин, склад, пекарна…) принадлежи на фирма; управителят вижда фирмата на всеки служител, филтрира таблото по фирма/обект и има раздел „Фирми“ с обобщение.

**Architecture:** Нова таблица `companies`; `stores` получава `company_id`, `kind`, `address`. Фирмата на служителя се извежда по веригата `users.store` (име) → `stores.company_id` → `companies`. Данните от файла на Нина се зареждат еднократно от константа в `server/src/companies.js` (като досегашния `ensureStores`). Нов маршрут `/api/admin/companies`, филтър на `/api/manager/overview`, нова страница `Companies.jsx`.

**Tech Stack:** Node.js 24 + Express, вграден `node:sqlite`, тестове с `node:test` (`npm --prefix server test`, всяка тестова база е в паметта); React + Vite (без клиентски тестове — проверка с `npm --prefix client run build` и в браузъра).

**Spec:** `docs/superpowers/specs/2026-09-30-firmi-i-obekti-design.md`

## Global Constraints

- Всички текстове в интерфейса и съобщенията за грешка са на български.
- Имената на обектите са с главни букви (като в Мистрал); съществуващите имена от `MISTRAL_STORES` не се променят.
- Видове обекти — точно: `магазин, склад, ресторант, комплекс, пекарна, аптека, производство, кухня, разнос, SPA`.
- Банка/BIC/IBAN не се пазят.
- `ensureCompanies` пише само ако `companies` е празна; след това данните се поддържат от управителя.
- Без права за достъп по фирма и без износ в Excel.
- Тестовете работят само върху базата в паметта (`import './env.js'` / `helpers.js` първо).
- Git: commit след всяка задача, съобщенията на български, завършват с `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Редакция на обект, която праща само част от полетата (напр. само ново име) — не трябва да изтрива фирмата/вида/адреса му. (Тест в Задача 3.)
2. Потребителската база вече има магазини и служители — при първо пускане фирмите се закачат, без да се пипат имената, `location_id` и хората. (Тест в Задача 1, миграция.)
3. Служител с магазин, който не е в списъка (стари данни, напр. „Магазин Люлин“) — показва се без фирма, филтърът „без фирма“ го хваща, нищо не гърми. (Тест в Задача 4.)
4. Невалидна фирма (`company_id` = текст или несъществуващо id) при запис на обект → 400, а не 500. (Тест в Задача 3.)
5. Раздел „Фирми“ брои само служителите (не управителите) и обектите без хора показват 0 / 0%, а не NaN. (Тест в Задача 2.)

---

## Файлова структура

| Файл | Отговорност |
|---|---|
| `server/src/companies.js` (нов) | `STORE_KINDS`, данните `NINA_COMPANIES`, `ensureCompanies(db)` |
| `server/src/companyOf.js` (нов) | `companyOfStore(name)` — име на фирмата на обект |
| `server/src/db.js` | таблица `companies`, нови колони в `stores`, извикване на `ensureCompanies` |
| `server/src/routes/companies.js` (нов) | `/api/admin/companies` — обобщение + CRUD |
| `server/src/routes/stores.js` | фирма, вид, адрес на обектите |
| `server/src/routes/manager.js` | филтър на таблото; фирма в детайла и при менторите |
| `server/src/mentorMatch.js`, `server/src/routes/discRequests.js` | фирма при менторите в „Заявки“ |
| `server/src/app.js` | монтиране на новия маршрут |
| `client/src/api.js` | нови извиквания |
| `client/src/pages/ManagerHome.jsx` | колона „Фирма“ + филтри |
| `client/src/pages/Companies.jsx` (нов) | раздел „Фирми“ |
| `client/src/pages/AdminUsers.jsx` | редакция на фирма/вид/адрес на обект; групиран списък |
| `client/src/pages/ManagerEmployee.jsx`, `Mentors.jsx`, `Requests.jsx` | показване на фирмата |
| `client/src/App.jsx` | маршрут и меню „Фирми“ |

---

### Task 1: Таблица „фирми“ и еднократно зареждане от файла на Нина

**Files:**
- Create: `server/src/companies.js`
- Modify: `server/src/db.js` (блокът `CREATE TABLE` в `initSchema` и `migrate()`)
- Test: `server/test/companies.test.js` (нов), `server/test/migration.test.js`

**Interfaces:**
- Produces: `STORE_KINDS: string[]`, `NINA_COMPANIES: {name, eik, mol, address, stores: {name, kind?, address?, location_id?}[]}[]`, `ensureCompanies(db): void` от `server/src/companies.js`. Таблица `companies(id, name UNIQUE, eik, mol, address, order_index)`; колони `stores.company_id INTEGER`, `stores.kind TEXT NOT NULL DEFAULT 'магазин'`, `stores.address TEXT`.

- [ ] **Step 1: Write the failing test** — `server/test/companies.test.js`:

```js
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
```

И в края на теста в `server/test/migration.test.js` (след последния `assert` в `test('стара база: …')`) добави:

```js
  // Фирмите се зареждат и в стара база; служител с непознат магазин остава на мястото си.
  assert.equal(db.prepare('SELECT COUNT(*) n FROM companies').get().n, 23);
  assert.equal(db.prepare('SELECT store FROM users WHERE id = 7').get().store, 'Магазин Люлин');
  const storeCols = db.prepare('PRAGMA table_info(stores)').all().map((c) => c.name);
  for (const c of ['company_id', 'kind', 'address']) assert.ok(storeCols.includes(c), `липсва stores.${c}`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '…/src/companies.js'`.

- [ ] **Step 3: Write `server/src/companies.js`**

```js
// Фирмите и обектите им – от таблицата „фирми и обекти (от Нина)“ (2026-09-30).
// Банка/BIC/IBAN нарочно не се пазят. Вид по подразбиране: магазин.
export const STORE_KINDS = ['магазин', 'склад', 'ресторант', 'комплекс', 'пекарна', 'аптека', 'производство', 'кухня', 'разнос', 'SPA'];

export const NINA_COMPANIES = [
  { name: '„Ан Груп 2009“ ООД', eik: 'BG200766360', mol: 'Асен Милков Миланов', address: 'гр. Варна, ул. „Сава Радулов“ №7', stores: [
    { name: 'ЧАТАЛДЖА', address: 'ул. „Сава Радулов“ №7' },
    { name: 'НЕПТУН', address: 'бул. „Сливница“ №76' },
  ] },
  { name: '„Крам Комерс БГ“ ЕООД', eik: 'BG200861577', mol: 'Антон Господинов', address: 'гр. Варна, пл. „Лаврентий“ 9', stores: [
    { name: 'АЛЕКС', address: 'ул. „Тодор Икономов“ №15' },
    { name: 'ГЪМЗА', address: 'ул. „Кавала“ №7' },
    { name: 'ТРАКИЯ', address: 'ул. „Възраждане“ 1А' },
    { name: 'САКАР', address: 'ул. „Батак“ №7' },
    { name: 'ОНИКС', address: 'ул. „Стефан Караджа“ №35' },
    { name: 'ПИРИН', address: 'ул. „Екатерина Симитчиева“ №9' },
    { name: 'МАКЕДОНИЯ', address: 'бул. „Македония“ №153' },
  ] },
  { name: '„Премиум 12“ ЕООД', eik: 'BG202133777', mol: 'Антон Господинов', address: 'гр. Варна, р-н Одесос, ул. „Г. Бенковски“ 3', stores: [
    { name: 'БЕНКОВСКИ', address: 'ул. „Г. Бенковски“ №3' },
    { name: 'КАЛИТИН', address: 'ул. „Калитин“ до бл. 28' },
    { name: 'МАРИЦА', address: 'ул. „Григорий Цамблак“ №7' },
  ] },
  { name: '„Прогрес БГ 13“ ООД', eik: 'BG202533515', mol: 'Асен Милков Миланов', address: 'гр. Варна, ул. „Подвис“ с/у блок 26', stores: [
    { name: 'ПОДВИС', address: 'ул. „Подвис“ с/у бл. 26' },
    { name: 'ДУБРОВНИК', address: 'ул. „Дубровник“ №4' },
    { name: 'ХЕБЪР', address: 'ул. „Радост“ №3А' },
    { name: 'ЕКО КОМПЛЕКС ИЗВОРИ', kind: 'комплекс', address: 'общ. Аксаково, м-ст Батова река' },
    { name: 'РЕСТОРАНТ ИЗВОРИ', kind: 'ресторант', address: 'общ. Аксаково, м-ст Батова река' },
  ] },
  { name: '„Прогрес 13“ ООД', eik: 'BG202408440', mol: 'Асен Милков Миланов', address: 'гр. Варна, ул. „Г. Бенковски“ №81, ет. 7, ап. 30', stores: [
    { name: 'БОЖУР', address: 'ул. „Божур“ №5' },
  ] },
  { name: '„Персика“ ЕООД', eik: 'BG202780394', mol: 'Стефан Андреев Соколов', address: 'гр. Варна, ул. „Васил Априлов“ №17, ет. 3, ап. 6', stores: [
    { name: 'ВЛАДИСЛАВ', address: 'ул. „Д-р Пискюлиев“ №98' },
    { name: 'МИР', address: 'ул. „Мир“ №73' },
  ] },
  { name: '„Графен Ритейл“ ЕООД', eik: 'BG202787079', mol: 'Славчо Кирилов Енев', address: 'гр. Варна, ул. „Братя Бъкстон“ №9, партер', stores: [
    { name: 'ГЕНЕРАЛИ', address: 'ул. „Цар Асен“ №54' },
    { name: 'КОЛХОЗА', address: 'ул. „Йосиф Стоянов“ 13' },
    { name: 'ТОПОЛИ', address: 'с. Тополи, ул. „Д-р Атанас Липов“ 20' },
    { name: 'ТУНДЖА', address: 'ул. „Любен Каравелов“ №68' },
    { name: 'БОРОВЕЦ', address: 'местност Боровец №726 север' },
  ] },
  { name: '„Триста БГ“ ООД', eik: 'BG202815710', mol: 'Мирослав Цвятков Георгиев', address: 'гр. Варна, ул. „Г. Бенковски“ №81, ет. 7, ап. 30', stores: [
    { name: 'ВЪЗРАЖДАНЕ', address: 'ж.к. Възраждане, 2-ри микрорайон, с/у бл. 40' },
    { name: 'СТРАНДЖА', address: 'ул. „Хан Пресиян“ 15' },
    { name: 'ВАРДАР', address: 'ул. „Капитан Райчо“ 40' },
    { name: 'ЯНТРА', address: 'бул. „Сливница“ 187Г, бл. 3, вх. 3' },
    { name: 'МЕСОПРЕРАБОТВАТЕЛНО ПРЕДПРИЯТИЕ', kind: 'производство', address: 'с. Яребична, общ. Аксаково' },
    { name: 'ЦЕХ ЗА САЛАТИ И САНДВИЧИ', kind: 'производство', address: 'с. Яребична, общ. Аксаково' },
    { name: 'КУХНЯ', kind: 'кухня', address: 'гр. Варна, ж.к. Възраждане, ул. „Вяра“ 7, партер' },
  ] },
  { name: '„Корект М 76“ ЕООД', eik: 'BG202408547', mol: 'Магдалена Русева', address: 'гр. София, ж.к. Младост 2, ул. „Свети Киприян“, бл. 281', stores: [
    { name: 'ВАРНЕНЧИК', address: 'ж.к. Владислав Варненчик, бл. 55, вх. 1' },
    { name: 'ПОВЕЛЯНОВО', address: 'гр. Девня, кв. Повеляново, бул. „Съединение“ 33' },
  ] },
  { name: '„Сиймлес 1 БГ“ ЕООД', eik: 'BG204119662', mol: 'Татяна Миланова', address: 'гр. Варна, ул. „Дебър“ №58', stores: [
    { name: 'ШИПКА', address: 'ул. „Шипка“ 18' },
    { name: 'ПРИМОРСКИ', address: 'ул. „Генерал Колев“ 75, вх. Б' },
    { name: 'ЦАРЕВЕЦ', address: 'ул. „Никулицел“ 10' },
  ] },
  { name: '„Маджестик Груп БГ“ ЕООД', eik: 'BG202058709', mol: 'Надежда Антонова Николова', address: 'гр. Варна, ул. „Васил Априлов“ №17', stores: [
    { name: 'МЛАДОСТ', address: 'ж.к. Младост, 2-ри микрорайон, южно от СОУ „Гео Милев“' },
    { name: 'ТОДОРКА', address: 'ул. „Братя Бъкстон“ №30Д' },
    { name: 'АНДЖИ', address: 'ул. „Гладстон“ №12' },
    { name: 'РИЛА', address: 'ул. „Гладстон“ №10' },
    { name: 'МАДЖЕСТИК', address: 'ул. „Христо Попович“ 33' },
    { name: 'ДОМИНГО', address: 'бул. „Чаталджа“ / ул. „Цар Асен“ (алкохол и цигари)' },
  ] },
  { name: '„М Трейд България“ ЕООД', eik: 'BG201371156', mol: 'Николай Георгиев', address: 'гр. Варна, р-н Одесос, пл. „Лаврентий“ 3', stores: [
    { name: 'ЛАВРЕНТИЙ', address: 'пл. „Лаврентий“ 3' },
    { name: 'ТРОШЕВО', address: 'ул. „Елин Пелин“ 57А' },
  ] },
  { name: '„Чифлика БГ 23“ ООД', eik: 'BG207285073', mol: 'Николай Костадинов', address: 'гр. Варна, ул. „Батак“ 7', stores: [
    { name: 'МИЗИЯ', address: 'гр. Девня, ул. „Хр. Ботев“ №18А' },
    { name: 'ЧИФЛИКА', address: 'гр. Долни Чифлик, ул. „Централен площад“ №48' },
    { name: 'КАМЧИЯ', address: 'гр. Долни Чифлик, ул. „23 септември“ №2' },
    { name: 'БАЛКАН', address: 'гр. Горен Чифлик, автоспирка' },
  ] },
  { name: '„Надина 5“ ЕООД', eik: 'BG206744506', mol: 'Надежда Николова', address: 'гр. Варна, ул. „Дебър“ 58, ет. 4', stores: [
    { name: 'НАДЕЖДА', address: 'с. Долен Близнак, ул. „Камчия“ 151' },
  ] },
  { name: '„Прогрес БГ 18“ ЕООД', eik: 'BG205164308', mol: 'Асен Миланов', address: 'гр. София, р-н Студентски, ул. „Професор Христо Данов“ 15', stores: [
    { name: 'СЛЪНЧОГЛЕДИТЕ', address: 'гр. София, ж.к. Студентски град, ул. „Проф. Христо Данов“ 15' },
    { name: 'СТУДЕНТСКИ', address: 'гр. София, ж.к. Студентски град, бл. 34' },
    { name: 'МЛАДОСТ (СОФИЯ)', address: 'гр. София, ж.к. Младост 2, ул. „Свети Киприян“, бл. 281' },
    { name: 'ЛОЗЕНЕЦ', address: 'гр. София, ул. „Бунтовник“ 39' },
  ] },
  { name: '„Т Логистик“ ООД', eik: 'BG207229060', mol: 'Николай Костадинов', address: 'гр. Варна, р-н Одесос, ул. „Македония“ №95', stores: [
    { name: 'ЦЕНТРАЛЕН СКЛАД', kind: 'склад', location_id: 13, address: 'кв. Вл. Варненчик, с/у бл. 305' },
    { name: 'ИСКЪР', address: 'ул. „Никола Михайловски“ 13' },
    { name: 'ОХРИД', address: 'ул. „Македония“ 95' },
  ] },
  { name: '„Ред Хот България“ ЕООД', eik: 'BG202420567', mol: 'Асен Милков Миланов', address: 'гр. Варна, ул. „Студентска“ №1', stores: [
    { name: 'ПИЦАРИЯ РЕД ХОТ', kind: 'ресторант', address: 'ул. „Студентска“ №1' },
  ] },
  { name: 'ЕТ „Премиум БГ – Татяна Миланова“', eik: 'BG202282212', mol: 'Татяна Милкова Миланова', address: 'с. Орешак, общ. Аксаково, обл. Варна', stores: [
    { name: 'SPA КОМПЛЕКС ИЗВОРИ', kind: 'SPA', address: 'общ. Аксаково, м-ст Батова река' },
  ] },
  { name: '„Клас Комерс БГ“ ООД', eik: 'BG204314954', mol: 'Михаил Стефанов Стефанов', address: 'гр. Варна, ул. „Цар Гавраил Радомир“ №5', stores: [
    { name: 'ПЕКАРНА ФЛОРЕНЦИЯ (ГЛАДСТОН)', kind: 'пекарна', address: 'ул. „Гладстон“ / ул. „Добруджа“' },
    { name: 'ПЕКАРНА ФЛОРЕНЦИЯ (ПОДВИС)', kind: 'пекарна', address: 'ул. „Подвис“ с/у бл. 26' },
    { name: 'ПЕКАРНА ХАПКАТА', kind: 'пекарна', address: 'ул. „Иван Вазов“' },
  ] },
  { name: '„Д Корект“ ЕООД', eik: 'BG202755537', mol: 'Мирослав Цвятков Георгиев', address: 'гр. Варна, ул. „Дебър“ №58, ет. 4, офис 20', stores: [
    { name: 'РАЗНОС', kind: 'разнос', address: 'хляб и зеленчук' },
  ] },
  { name: '„Еврофарм БГ“ ООД', eik: 'BG204119598', mol: 'Юрий Свиленов Савов', address: 'гр. Варна, ул. „Дебър“ №58, ет. 4, офис 20', stores: [
    { name: 'АПТЕКА ЕВРОФАРМ', kind: 'аптека', address: 'ул. „Уилям Гладстон“ 10' },
  ] },
  { name: '„Бандитс“ ООД', eik: 'BG205745904', mol: 'Мирослав Цвятков Георгиев', address: 'гр. Варна, ул. „Дебър“ №58, ет. 4, офис 23', stores: [
    { name: 'ЦЕХ ЗА САНДВИЧИ', kind: 'производство', address: 'кв. Галата, ул. „Дядо Димитър Македонеца“ 1А' },
    { name: 'ГОСТИЛНИЦА БОРОВЕЦ', kind: 'ресторант' },
  ] },
  { name: '„Примера М“ ЕООД', eik: 'BG204437704', mol: 'Валери Йорданов Георгиев', address: 'гр. Варна, р-н Одесос, ул. „Солун“ №3', stores: [] },
];

// Попълва фирмите само ако таблицата е празна – след това ги поддържа управителят.
// Съществуващ обект (по име) получава фирма, вид и адрес; липсващ се създава в края на списъка.
export function ensureCompanies(db) {
  if (db.prepare('SELECT COUNT(*) n FROM companies').get().n > 0) return;
  const insCompany = db.prepare('INSERT INTO companies (name, eik, mol, address, order_index) VALUES (?, ?, ?, ?, ?)');
  const findStore = db.prepare('SELECT id FROM stores WHERE name = ?');
  const updStore = db.prepare('UPDATE stores SET company_id = ?, kind = ?, address = ? WHERE id = ?');
  const insStore = db.prepare('INSERT INTO stores (name, location_id, order_index, company_id, kind, address) VALUES (?, ?, ?, ?, ?, ?)');
  const nextOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM stores');
  db.exec('BEGIN');
  try {
    NINA_COMPANIES.forEach((c, i) => {
      const cid = Number(insCompany.run(c.name, c.eik, c.mol, c.address, i).lastInsertRowid);
      for (const s of c.stores) {
        const kind = s.kind ?? 'магазин';
        const address = s.address ?? null;
        const found = findStore.get(s.name);
        if (found) updStore.run(cid, kind, address, found.id);
        else insStore.run(s.name, s.location_id ?? null, nextOrder.get().n, cid, kind, address);
      }
    });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
```

- [ ] **Step 4: Wire it into `server/src/db.js`**

До `import { ensureStores } from './stores.js';` добави:

```js
import { ensureCompanies } from './companies.js';
```

В големия `db.exec(\`…\`)` на `initSchema`, веднага след блока `CREATE TABLE IF NOT EXISTS stores (…);`, добави:

```sql
    CREATE TABLE IF NOT EXISTS companies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      eik         TEXT,                            -- ЕИК/ДДС номер
      mol         TEXT,
      address     TEXT,                            -- адрес на управление
      order_index INTEGER NOT NULL DEFAULT 0
    );
```

В `migrate()`, след `addCol('modules', 'duration', …);`, добави:

```js
  addCol('stores', 'company_id', 'company_id INTEGER');
  addCol('stores', 'kind', "kind TEXT NOT NULL DEFAULT 'магазин'");
  addCol('stores', 'address', 'address TEXT');
```

И замени последния ред на `migrate()` `ensureStores(db);` с:

```js
  ensureStores(db);
  ensureCompanies(db);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix server test`
Expected: всички тестове PASS (старите 42 + новите).

- [ ] **Step 6: Commit**

```bash
git add server/src/companies.js server/src/db.js server/test/companies.test.js server/test/migration.test.js
git commit -m "Фирми: таблица и еднократно зареждане от файла на Нина (23 фирми, всички обекти)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Маршрут „Фирми“ — обобщение и управление

**Files:**
- Create: `server/src/routes/companies.js`
- Modify: `server/src/app.js`
- Test: `server/test/companiesApi.test.js` (нов)

**Interfaces:**
- Consumes: таблиците от Задача 1; `getCatalog(userId).overall` от `server/src/progressCalc.js`; `requireManager` от `server/src/auth.js`.
- Produces: `GET /api/admin/companies` → `{ companies: [{ id, name, eik, mol, address, stores: [{ id, name, kind, address, company_id, people, avgProgress }], people, avgProgress }], unassigned: { stores, people, avgProgress } }`; `POST /api/admin/companies` → `{ id }`; `PUT /api/admin/companies/:id` → `{ ok }`; `DELETE /api/admin/companies/:id` → `{ ok }`.

- [ ] **Step 1: Write the failing test** — `server/test/companiesApi.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL в `companiesApi.test.js` — статус 404 вместо 200 (маршрутът липсва).

- [ ] **Step 3: Write `server/src/routes/companies.js`**

```js
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
```

- [ ] **Step 4: Mount it in `server/src/app.js`**

След `import storesRoutes from './routes/stores.js';` добави `import companiesRoutes from './routes/companies.js';`, а след `app.use('/api/admin/stores', storesRoutes);` добави:

```js
  app.use('/api/admin/companies', companiesRoutes);
```

(Трябва да е преди `app.use('/api/admin', adminRoutes);`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix server test`
Expected: всички PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/companies.js server/src/app.js server/test/companiesApi.test.js
git commit -m "Фирми: обобщение по фирма и обект + добавяне, редакция, изтриване

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Обектите получават фирма, вид и адрес

**Files:**
- Modify: `server/src/routes/stores.js`
- Test: `server/test/stores.test.js`

**Interfaces:**
- Consumes: `STORE_KINDS` от `server/src/companies.js`.
- Produces: `GET /api/admin/stores` → `{ stores: [{ id, name, location_id, company_id, company_name, kind, address, people }], kinds: STORE_KINDS }`. `POST`/`PUT` приемат по желание `company_id` (число, `''` или `null`), `kind`, `address`; при `PUT` липсващо поле запазва старата стойност.

- [ ] **Step 1: Write the failing tests** — добави в края на `server/test/stores.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL в `stores.test.js` — `company_name` е `undefined`.

- [ ] **Step 3: Update `server/src/routes/stores.js`**

Добави импорт горе: `import { STORE_KINDS } from '../companies.js';`

Замени функцията `readBody` с:

```js
// При редакция (old) липсващо поле запазва старата стойност.
function readBody(body, old = {}) {
  const has = (k) => body != null && Object.prototype.hasOwnProperty.call(body, k);
  const pick = (k, fallback) => (has(k) ? body[k] : old[k] ?? fallback);
  const toId = (v) => (v === '' || v == null ? null : Number(v));
  const location_id = toId(pick('location_id', null));
  return {
    name: String(pick('name', '')).trim(),
    location_id: Number.isFinite(location_id) ? location_id : null,
    company_id: toId(pick('company_id', null)),
    kind: String(pick('kind', 'магазин')).trim(),
    address: String(pick('address', '') ?? '').trim() || null,
  };
}

function invalid(v) {
  if (!v.name) return 'Въведи име на магазина.';
  if (!STORE_KINDS.includes(v.kind)) return 'Избери вид на обекта от списъка.';
  if (v.company_id != null && (!Number.isInteger(v.company_id) || !db.prepare('SELECT 1 FROM companies WHERE id = ?').get(v.company_id)))
    return 'Избери фирма от списъка.';
  return null;
}
```

Замени `router.get('/', …)` с:

```js
router.get('/', (_req, res) => {
  const stores = db.prepare(`
    SELECT s.id, s.name, s.location_id, s.company_id, c.name AS company_name, s.kind, s.address,
      (SELECT COUNT(*) FROM users u WHERE u.store = s.name) AS people
    FROM stores s LEFT JOIN companies c ON c.id = s.company_id
    ORDER BY s.order_index, s.name`).all();
  res.json({ stores, kinds: STORE_KINDS });
});
```

Замени `router.post('/', …)` с:

```js
router.post('/', (req, res) => {
  const v = readBody(req.body);
  const error = invalid(v);
  if (error) return res.status(400).json({ error });
  if (storeExists(v.name)) return res.status(409).json({ error: 'Вече има магазин с това име.' });
  const order = db.prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM stores').get().n;
  const id = db.prepare('INSERT INTO stores (name, location_id, order_index, company_id, kind, address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(v.name, v.location_id, order, v.company_id, v.kind, v.address).lastInsertRowid;
  res.json({ id: Number(id) });
});
```

В `router.put('/:id', …)` замени редовете от `const { name, location_id } = readBody(req.body);` до `db.exec('BEGIN');` включително и заявката `UPDATE stores …` така, че тялото да стане:

```js
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: 'Магазинът не е намерен.' });
  const v = readBody(req.body, old);
  const error = invalid(v);
  if (error) return res.status(400).json({ error });
  if (db.prepare('SELECT 1 FROM stores WHERE name = ? AND id != ?').get(v.name, id))
    return res.status(409).json({ error: 'Вече има магазин с това име.' });
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE stores SET name = ?, location_id = ?, company_id = ?, kind = ?, address = ? WHERE id = ?')
      .run(v.name, v.location_id, v.company_id, v.kind, v.address, id);
    db.prepare('UPDATE users SET store = ? WHERE store = ?').run(v.name, old.name);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ ok: true });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix server test`
Expected: всички PASS (включително старите тестове за магазини).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/stores.js server/test/stores.test.js
git commit -m "Обекти: фирма, вид и адрес; частична редакция не губи данни

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Филтър на таблото и фирма навсякъде, където се вижда магазинът

**Files:**
- Create: `server/src/companyOf.js`
- Modify: `server/src/routes/manager.js` (`/overview`, `/mentors`, `/employees/:id`), `server/src/mentorMatch.js` (`listMentors`), `server/src/routes/discRequests.js` (`view`)
- Test: `server/test/companyViews.test.js` (нов)

**Interfaces:**
- Produces: `companyOfStore(store: string|null): string|null` от `server/src/companyOf.js`. `GET /api/manager/overview?company=<id|none>&store=<име>` — всеки ред в `employees` има `company` (име или `null`); `stats` е само върху филтрираните. `employee.company` в `/manager/employees/:id`; `company` при всеки ментор и всеки елемент на `activeList` в `/manager/mentors`; `company` при менторите в `listMentors()` и в `suggested_mentor` от `/manager/disc-requests`.

- [ ] **Step 1: Write the failing test** — `server/test/companyViews.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL в `companyViews.test.js` — `company` е `undefined`.

- [ ] **Step 3: Create `server/src/companyOf.js`**

```js
import { db } from './db.js';

// Името на фирмата на обект (по име на обекта) или null – ако обектът е без фирма или не съществува.
export function companyOfStore(store) {
  if (!store) return null;
  return db.prepare('SELECT c.name FROM stores s JOIN companies c ON c.id = s.company_id WHERE s.name = ?').get(store)?.name ?? null;
}
```

- [ ] **Step 4: Update `server/src/routes/manager.js`**

Добави импорт: `import { companyOfStore } from '../companyOf.js';`

Замени началото на `router.get('/overview', …)` — от `router.get('/overview', (_req, res) => {` до `const rows = employees.map((e) => {` — с:

```js
router.get('/overview', (req, res) => {
  const { company, store } = req.query;
  let employees = db.prepare(`
    SELECT u.id, u.name, u.email, u.store, u.position, u.mentor, u.start_date, s.company_id, c.name AS company
    FROM users u
    LEFT JOIN stores s ON s.name = u.store
    LEFT JOIN companies c ON c.id = s.company_id
    WHERE u.role = 'employee' ORDER BY u.name`).all();
  if (company === 'none') employees = employees.filter((e) => e.company_id == null);
  else if (company) employees = employees.filter((e) => e.company_id === Number(company));
  if (store) employees = employees.filter((e) => e.store === store);

  const rows = employees.map((e) => {
```

И в обекта, който `rows` връща, замени реда `id: e.id, name: e.name, store: e.store, position: e.position, mentor: e.mentor,` с:

```js
      id: e.id, name: e.name, store: e.store, company: e.company, position: e.position, mentor: e.mentor,
```

В `router.get('/mentors', …)`:
- ред `const activeList = mentees.filter(…).map((e) => ({ id: e.id, name: e.name, store: e.store, start_date: e.start_date }));` → замени `store: e.store,` с `store: e.store, company: companyOfStore(e.store),`;
- в `return { id: mtr.id, name: mtr.name, store: mtr.store, …` добави след `store: mtr.store,` → `company: companyOfStore(mtr.store),`.

В `router.get('/employees/:id', …)` замени `res.json({ employee: e, ...catalog });` с:

```js
  res.json({ employee: { ...e, company: companyOfStore(e.store) }, ...catalog });
```

- [ ] **Step 5: Update `server/src/mentorMatch.js` и `server/src/routes/discRequests.js`**

В `mentorMatch.js` добави `import { companyOfStore } from './companyOf.js';` и замени `listMentors`:

```js
export function listMentors() {
  return db.prepare('SELECT id, name, store, mentor_style FROM users WHERE is_mentor = 1 ORDER BY name').all()
    .map((m) => ({ ...m, company: companyOfStore(m.store), active: activeMenteeCount(m.name) }));
}
```

В `discRequests.js` добави `import { companyOfStore } from '../companyOf.js';` и във `view(r)`:
- ред `m = s ? { id: s.id, name: s.name, store: s.store, mentor_style: s.mentor_style } : null;` → `m = s ? { id: s.id, name: s.name, store: s.store, company: s.company, mentor_style: s.mentor_style } : null;`
- в клона `else` след заявката добави: `if (m) m = { ...m, company: companyOfStore(m.store) };`

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm --prefix server test`
Expected: всички PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/companyOf.js server/src/routes/manager.js server/src/mentorMatch.js server/src/routes/discRequests.js server/test/companyViews.test.js
git commit -m "Табло: филтър по фирма и обект; фирмата в детайла, при менторите и в заявките

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Табло с колона „Фирма“ и филтри; фирмата в картите

**Files:**
- Modify: `client/src/api.js`, `client/src/pages/ManagerHome.jsx`, `client/src/pages/ManagerEmployee.jsx`, `client/src/pages/Mentors.jsx`, `client/src/pages/Requests.jsx`

**Interfaces:**
- Consumes: `/manager/overview?company&store`, `/admin/companies`, полето `company` от Задача 4.
- Produces: `api.managerOverview(params?: {company?, store?})`, `api.adminCompanies()`, `api.adminCreateCompany(data)`, `api.adminUpdateCompany(id, data)`, `api.adminDeleteCompany(id)`.

- [ ] **Step 1: `client/src/api.js`**

Замени `managerOverview: () => request('/manager/overview'),` с:

```js
  managerOverview: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request('/manager/overview' + (q ? '?' + q : ''));
  },
```

И след блока `// ── админ: магазини ──` добави:

```js

  // ── админ: фирми ──
  adminCompanies: () => request('/admin/companies'),
  adminCreateCompany: (data) => request('/admin/companies', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCompany: (id, data) => request('/admin/companies/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCompany: (id) => request('/admin/companies/' + id, { method: 'DELETE' }),
```

- [ ] **Step 2: `client/src/pages/ManagerHome.jsx`**

Замени импортите и началото на компонента (до `const { stats, employees } = data;` включително) с:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Bar, Loading, initials } from '../components.jsx';

export default function ManagerHome() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const company = params.get('company') || '';
  const store = params.get('store') || '';
  const [data, setData] = useState(null);
  const [groups, setGroups] = useState(null);
  useEffect(() => { api.adminCompanies().then(setGroups); }, []);
  useEffect(() => { api.managerOverview({ company, store }).then(setData); }, [company, store]);
  if (!data || !groups) return <Loading />;

  const { stats, employees } = data;
  const storesOf = company === 'none' ? groups.unassigned.stores
    : company ? (groups.companies.find((c) => String(c.id) === company)?.stores || [])
    : [...groups.companies.flatMap((c) => c.stores), ...groups.unassigned.stores];
  const setFilter = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
```

Между затварящия `</div>` на `<div className="stats">` и `<div className="card" style={{ overflowX: 'auto' }}>` вмъкни филтрите:

```jsx
      <div className="card" style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div className="field" style={{ margin: 0, flex: '1 1 240px' }}><label>Фирма</label>
          <select value={company} onChange={(e) => setFilter({ company: e.target.value })}>
            <option value="">Всички фирми</option>
            {groups.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">— без фирма —</option>
          </select></div>
        <div className="field" style={{ margin: 0, flex: '1 1 200px' }}><label>Обект</label>
          <select value={store} onChange={(e) => setFilter({ company, store: e.target.value })}>
            <option value="">Всички обекти</option>
            {storesOf.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select></div>
        {(company || store) && <button className="btn ghost sm" onClick={() => setFilter({})}>Изчисти</button>}
      </div>
```

В таблицата: заглавието `<th>Служител</th><th>Магазин</th><th>Ментор</th>` → `<th>Служител</th><th>Магазин</th><th>Фирма</th><th>Ментор</th>`, а след `<td className="muted">{e.store}</td>` добави `<td className="muted">{e.company || '—'}</td>`. Ако `employees` е празен, след `</tbody>` не се показва нищо — добави преди `</tbody>`:

```jsx
            {employees.length === 0 && <tr style={{ cursor: 'default' }}><td colSpan={7} className="muted">Няма служители за избрания филтър.</td></tr>}
```

- [ ] **Step 3: Фирмата в картите**

`ManagerEmployee.jsx`: `<div className="muted" style={{ marginTop: 4 }}>{e.position} · {e.store}</div>` →

```jsx
          <div className="muted" style={{ marginTop: 4 }}>{[e.position, e.store, e.company].filter(Boolean).join(' · ')}</div>
```

`Mentors.jsx`:
- `{m.store || 'без магазин'} · обучава <b>{m.active}</b>` → `{m.store || 'без магазин'}{m.company ? ` · ${m.company}` : ''} · обучава <b>{m.active}</b>`
- `<div className="muted" style={{ fontSize: 12.5 }}>{m.position} · {m.store}</div>` → `<div className="muted" style={{ fontSize: 12.5 }}>{[m.position, m.store, m.company].filter(Boolean).join(' · ')}</div>`

`Requests.jsx`: `{m.name} · {m.mentor_style || '?'} · {m.store || 'без магазин'} · обучава {m.active}` → `{m.name} · {m.mentor_style || '?'} · {m.store || 'без магазин'}{m.company ? ` (${m.company})` : ''} · обучава {m.active}`

- [ ] **Step 4: Build to verify**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 5: Commit**

```bash
git add client/src/api.js client/src/pages/ManagerHome.jsx client/src/pages/ManagerEmployee.jsx client/src/pages/Mentors.jsx client/src/pages/Requests.jsx
git commit -m "Табло: колона „Фирма“ и филтри по фирма и обект; фирмата при служителя, менторите и заявките

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Раздел „Фирми“

**Files:**
- Create: `client/src/pages/Companies.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `api.adminCompanies/adminCreateCompany/adminUpdateCompany/adminDeleteCompany` (Задача 5); `Modal`, `Loading`, `Bar` от `components.jsx`; `Icon` от `icons.jsx`.

- [ ] **Step 1: Create `client/src/pages/Companies.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Bar, Loading, Modal } from '../components.jsx';

const BLANK = { name: '', eik: '', mol: '', address: '' };

function StoresTable({ stores, onOpen }) {
  if (!stores.length) return <div className="muted" style={{ padding: '10px 0' }}>Няма обекти.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead><tr><th>Обект</th><th>Вид</th><th>Хора</th><th style={{ width: 200 }}>Среден прогрес</th></tr></thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id} onClick={() => onOpen(s)} title="Виж служителите в таблото">
              <td><b>{s.name}</b>{s.address && <div className="muted" style={{ fontSize: 12.5 }}>{s.address}</div>}</td>
              <td className="muted">{s.kind}</td>
              <td className="tabnum">{s.people}</td>
              <td>{s.people ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flex: 1 }}><Bar percent={s.avgProgress} /></div><b className="tabnum">{s.avgProgress}%</b></div> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompanyCard({ c, open, onToggle, onEdit, onDelete, onOpenStore }) {
  return (
    <div className="card" style={{ padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ flex: '1 1 260px' }}>
          <b style={{ fontSize: 16 }}>{c.name}</b>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {[c.eik && `ЕИК ${c.eik}`, c.mol && `МОЛ: ${c.mol}`].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <div className="muted" style={{ fontSize: 13 }}><b style={{ color: 'var(--ink)' }}>{c.stores.length}</b> обекта · <b style={{ color: 'var(--ink)' }}>{c.people}</b> служители</div>
        <div style={{ width: 160, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><Bar percent={c.avgProgress} /></div><b className="tabnum">{c.avgProgress}%</b></div>
        {onEdit && (
          <div className="admin-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" title="Редакция" onClick={onEdit}><Icon name="edit" size={18} /></button>
            <button className="icon-btn danger" title={c.stores.length ? 'Първо премести обектите' : 'Изтрий'} disabled={c.stores.length > 0} onClick={onDelete}><Icon name="trash" size={18} /></button>
          </div>
        )}
      </div>
      {open && <div style={{ marginTop: 12 }}><StoresTable stores={c.stores} onOpen={onOpenStore} /></div>}
    </div>
  );
}

export default function Companies() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.adminCompanies().then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <Loading />;

  const toggle = (key) => setOpen((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const openStore = (companyKey) => (s) => nav(`/manager?company=${companyKey}&store=${encodeURIComponent(s.name)}`);

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editing.id) await api.adminUpdateCompany(editing.id, editing);
      else await api.adminCreateCompany(editing);
      setEditing(null);
      load();
    } catch (ex) { setErr(ex.message); }
  }
  async function remove(c) {
    if (!confirm(`Да изтрия ли фирма „${c.name}“?`)) return;
    try { await api.adminDeleteCompany(c.id); load(); } catch (ex) { alert(ex.message); }
  }

  return (
    <div className="wrap">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Фирми · {data.companies.length}</div>
          <h1>Фирми и обекти</h1>
          <p>Всеки обект е към своята фирма. Натисни фирма, за да видиш обектите ѝ, и обект — за служителите в него.</p>
        </div>
        <button className="btn" onClick={() => { setErr(''); setEditing({ ...BLANK }); }}><Icon name="plus" size={17} /> Нова фирма</button>
      </div>

      {data.companies.map((c) => (
        <CompanyCard key={c.id} c={c} open={open.has(c.id)} onToggle={() => toggle(c.id)}
          onEdit={() => { setErr(''); setEditing({ id: c.id, name: c.name, eik: c.eik || '', mol: c.mol || '', address: c.address || '' }); }}
          onDelete={() => remove(c)} onOpenStore={openStore(c.id)} />
      ))}

      {data.unassigned.stores.length > 0 && (
        <CompanyCard c={{ name: 'Без фирма', ...data.unassigned }} open={open.has('none')} onToggle={() => toggle('none')} onOpenStore={openStore('none')} />
      )}

      {editing && (
        <Modal title={editing.id ? 'Редакция на фирма' : 'Нова фирма'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="field"><label>Име</label>
              <input value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="напр. „Нова Фирма“ ЕООД" /></div>
            <div className="field"><label>ЕИК</label>
              <input value={editing.eik} onChange={(e) => setEditing({ ...editing, eik: e.target.value })} placeholder="напр. BG202533515" /></div>
            <div className="field"><label>МОЛ</label>
              <input value={editing.mol} onChange={(e) => setEditing({ ...editing, mol: e.target.value })} /></div>
            <div className="field"><label>Адрес на управление</label>
              <input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={!editing.name.trim()}>Запази</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Route and menu in `client/src/App.jsx`**

- След `import Requests from './pages/Requests.jsx';` добави `import Companies from './pages/Companies.jsx';`
- След `<Route path="/manager/employee/:id" element={<ManagerEmployee />} />` добави `<Route path="/companies" element={<Companies />} />`
- След `<NavLink to="/manager" …>Табло</NavLink>` добави:

```jsx
              <NavLink to="/companies" className={({ isActive }) => isActive ? 'active' : ''}>Фирми</NavLink>
```

- [ ] **Step 3: Build to verify**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Companies.jsx client/src/App.jsx
git commit -m "Нов раздел „Фирми“: обекти, служители и прогрес по фирма; добавяне и редакция

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Служители → Магазини: фирма, вид и адрес; групиран избор на магазин

**Files:**
- Modify: `client/src/pages/AdminUsers.jsx`

**Interfaces:**
- Consumes: `GET /admin/stores` → `{ stores, kinds }` (Задача 3); `api.adminCompanies()` (Задача 5, за списъка с фирми).

- [ ] **Step 1: Зареждане на видовете и фирмите в `AdminUsers`**

В `AdminUsers` до `const [stores, setStores] = useState([]);` добави:

```jsx
  const [kinds, setKinds] = useState([]);
  const [companies, setCompanies] = useState([]);
```

Замени `api.adminStores().then((d) => setStores(d.stores));` с:

```jsx
    api.adminStores().then((d) => { setStores(d.stores); setKinds(d.kinds); });
    api.adminCompanies().then((d) => setCompanies(d.companies));
```

И `<StoresSection stores={stores} reload={load} />` → `<StoresSection stores={stores} kinds={kinds} companies={companies} reload={load} />`.

- [ ] **Step 2: Замени целия `StoresSection` с версия с фирма, вид и адрес**

```jsx
const STORE_BLANK = { name: '', location_id: '', company_id: '', kind: 'магазин', address: '' };

function StoresSection({ stores, kinds, companies, reload }) {
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editing.id) await api.adminUpdateStore(editing.id, editing);
      else await api.adminCreateStore(editing);
      setEditing(null);
      reload();
    } catch (ex) { setErr(ex.message); }
  }
  async function remove(s) {
    if (!confirm(`Да изтрия ли обект „${s.name}“?`)) return;
    try { await api.adminDeleteStore(s.id); reload(); } catch (ex) { alert(ex.message); }
  }

  return (
    <>
      <div className="section-head" style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div className="eyebrow">Магазини и обекти · {stores.length}</div>
        <button className="btn sm" onClick={() => { setErr(''); setEditing({ ...STORE_BLANK }); }}><Icon name="plus" size={16} /> Нов обект</button>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>№</th><th>Обект</th><th>Вид</th><th>Фирма</th><th>Хора</th><th></th></tr></thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id} style={{ cursor: 'default' }}>
                <td className="muted tabnum">{s.location_id ?? '—'}</td>
                <td><b>{s.name}</b>{s.address && <div className="muted" style={{ fontSize: 12.5 }}>{s.address}</div>}</td>
                <td className="muted">{s.kind}</td>
                <td className="muted">{s.company_name || '—'}</td>
                <td className="tabnum">{s.people}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" title="Редакция" onClick={() => { setErr(''); setEditing({ id: s.id, name: s.name, location_id: s.location_id ?? '', company_id: s.company_id ?? '', kind: s.kind, address: s.address || '' }); }}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn danger" title="Изтрий" disabled={s.people > 0} onClick={() => remove(s)}><Icon name="trash" size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редакция на обект' : 'Нов обект'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="field"><label>Име</label>
                <input value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="напр. ВИТОША" /></div>
              <div className="field"><label>№ в Мистрал</label>
                <input type="number" value={editing.location_id} onChange={(e) => setEditing({ ...editing, location_id: e.target.value })} /></div>
              <div className="field"><label>Фирма</label>
                <select value={editing.company_id} onChange={(e) => setEditing({ ...editing, company_id: e.target.value })}>
                  <option value="">— без фирма —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div className="field"><label>Вид</label>
                <select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                  {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
                </select></div>
            </div>
            <div className="field"><label>Адрес</label>
              <input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={!editing.name.trim()}>Запази</button>
          </form>
        </Modal>
      )}
    </>
  );
}
```

- [ ] **Step 3: Групиран списък „Магазин“ във формата за служител**

Замени `{stores.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}` (в `<select value={editing.store || ''} …>`) с:

```jsx
                {[...new Set(stores.map((s) => s.company_name || ''))]
                  .sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'bg'))
                  .map((co) => (
                    <optgroup key={co || 'none'} label={co || 'Без фирма'}>
                      {stores.filter((s) => (s.company_name || '') === co).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </optgroup>
                  ))}
```

- [ ] **Step 4: Build to verify**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AdminUsers.jsx
git commit -m "Служители → Магазини: фирма, вид и адрес на обекта; магазините групирани по фирма

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Проверка в браузъра и документация

**Files:**
- Modify: `README.md` (раздела, който описва менюто на управителя)

- [ ] **Step 1: Всички тестове и build**

Run: `npm --prefix server test` и `npm --prefix client run build`
Expected: всички PASS; build без грешки.

- [ ] **Step 2: Пусни приложението наново** (старият START.bat държи стария сървърен код)

Спри работещия сървър, после от PowerShell: `Start-Process START.bat` в папката на проекта. Отвори http://localhost:5173, вход `mariya@trista.bg` / `trista123`.

- [ ] **Step 3: Ръчна проверка**
- Меню: „Фирми“ е между „Табло“ и „Ментори“; 23 фирми + „Без фирма“ (7 обекта).
- „Прогрес БГ 13“ → разгъва ДУБРОВНИК, ПОДВИС, ХЕБЪР, ЕКО КОМПЛЕКС ИЗВОРИ, РЕСТОРАНТ ИЗВОРИ; клик на ДУБРОВНИК → Табло, филтрирано, картите горе са за двамата от Дубровник.
- Табло: колона „Фирма“; избор на фирма стеснява списъка „Обект“; „Изчисти“ връща всички.
- Служители → Магазини: редакция на СОЛУН → фирма „Примера М“ → записва; в „Фирми“ СОЛУН вече е под „Примера М“, а „Без фирма“ има 6.
- Формата за служител: списъкът „Магазин“ е групиран по фирма.
- На телефонна ширина (≈390px) филтрите и картите не излизат извън екрана.

- [ ] **Step 4: README** — в описанието на менюто на управителя добави „Фирми“ (след „Табло“) с едно изречение: „Фирми – всички фирми с обектите им, брой служители и среден прогрес; оттук се добавят и редактират фирми. Фирмата и видът на всеки обект се сменят в Служители → Магазини.“

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Упътване: раздел „Фирми“

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
