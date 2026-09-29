# DISC тест за нови служители + насочване към ментор — план за изпълнение

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичен DISC тест през QR → автоматично предложен ментор със същия стил → заявка, която управителят одобрява (създава служител с вход по телефон) → изглед „кой ментор кого обучава“ с бутон „Завършил“; плюс списък с магазините от Мистрал.

**Architecture:** Express + вграден `node:sqlite` (без нови пакети). Нови малки модули на сървъра: `phone.js` (нормализиране), `stores.js` (списък от Мистрал), `mentorMatch.js` (натовареност/избор), маршрути `routes/publicDisc.js`, `routes/discRequests.js`, `routes/stores.js`. Приложението се изнася в `app.js` (`createApp()`), за да се тества през HTTP. Клиент React + Vite: нови страници `DiscStart.jsx` (публична) и `Requests.jsx`, разширения на `Mentors.jsx`, `AdminUsers.jsx`, `Login.jsx`.

**Tech Stack:** Node 24 (`node:sqlite`, `node:test`), Express 4, bcryptjs, jsonwebtoken; React 18 + react-router, `qrcode`.

**Spec:** `docs/superpowers/specs/2026-09-29-disc-mentor-matching-design.md`

**Корен на проекта:** `C:\Users\Пламен\Desktop\triesta-obuchenie` — всички пътища по-долу са относителни спрямо него.

## Global Constraints

- Без нови npm пакети (тестовете — само `node:test` + `node:assert/strict` + глобалния `fetch`).
- Всички текстове за потребителя — на български.
- Нормализиран телефон: 10 цифри, започва с `0` (`0888123456`); `+359…`, `359…`, `00359…` → `0…`; интервали/тирета/скоби се махат.
- Служител: телефонът е задължителен, имейлът — незадължителен. Управител: имейлът е задължителен.
- Кандидатът **никога** не вижда своя DISC резултат, нито името на ментора (публичните отговори връщат само `{ ok: true }`).
- Публичните въпроси не съдържат полето `style`; отговорите се пращат като индекс на избрания отговор (0–3).
- Временна парола: 8 знака от `abcdefghjkmnpqrstuvwxyz23456789`, показва се само веднъж.
- Активен обучаем = `role='employee' AND mentor = <име на ментора> AND mentorship_done_at IS NULL`.
- Съществуващите KPI/бонуси/„Ментор на годината“ се смятат както досега (върху всички обучаеми на ментора).
- Команда за тестове: `npm --prefix server test` (от корена на проекта).
- Всеки commit завършва с ред `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Стара база с реални данни (email NOT NULL) → миграцията не губи нито един потребител и прогреса му остава свързан → тест в Task 2.
2. Двама управители одобряват една и съща заявка (двоен клик) → вторият получава 409, създава се само един акаунт → тест в Task 6.
3. Кандидатът въвежда телефона с интервали/`+359` при теста, а после влиза с `0888…` → входът работи → тест в Task 6.
4. Преименуване на магазин, в който има хора → хората остават към новото име; изтриване на такъв магазин → отказ → тест в Task 3.
5. Ментор със същия стил няма → заявката се записва без предложение и управителят може да одобри с ментор по избор → тестове в Task 5 и Task 6.

---

### Task 1: Тестова основа — `DB_PATH`, `app.js`, помощни функции

**Files:**
- Modify: `server/src/db.js:10`
- Create: `server/src/app.js`
- Modify: `server/src/index.js`
- Modify: `server/package.json` (скрипт `test`)
- Create: `server/test/helpers.js`
- Create: `server/test/smoke.test.js`

**Interfaces:**
- Produces: `createApp(): express.Application` от `server/src/app.js`.
- Produces от `server/test/helpers.js`: `startServer(): Promise<{ base: string, close(): Promise<void> }>`, `makeClient(base): (method, path, body?) => Promise<{ status, data }>` (пази бисквитката между заявките), `addUser(fields): number` (връща id; парола по подразбиране `'test123'`).

- [ ] **Step 1: База в паметта при тестове**

В `server/src/db.js` замени реда `export const db = new DatabaseSync(join(dataDir, 'triesta.db'));` с:

```js
// При `node --test` (NODE_TEST_CONTEXT) всеки тестов файл получава празна база в паметта.
const dbFile = process.env.DB_PATH || (process.env.NODE_TEST_CONTEXT ? ':memory:' : join(dataDir, 'triesta.db'));
export const db = new DatabaseSync(dbFile);
```

- [ ] **Step 2: Изнеси приложението в `server/src/app.js`**

```js
import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { attachUser } from './auth.js';
import authRoutes from './routes/auth.js';
import learnRoutes from './routes/learn.js';
import managerRoutes from './routes/manager.js';
import adminRoutes from './routes/admin.js';
import applyRoutes from './routes/apply.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // зад HTTPS proxy (хостинг/тунел)
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/learn', learnRoutes);
  app.use('/api/manager', managerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/apply', applyRoutes); // публичен – без вход

  // В режим на качване сървърът сервира и готовия сайт (client/dist),
  // така че всичко работи на един адрес.
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  if (existsSync(join(clientDist, 'index.html')) && !process.env.NODE_TEST_CONTEXT) {
    app.use(express.static(clientDist));
    // Всеки не-API GET заявка връща приложението (за да работят вътрешните адреси).
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(join(clientDist, 'index.html'));
      next();
    });
    console.log('▸ Сервирам готовия сайт от client/dist');
  }
  return app;
}
```

- [ ] **Step 3: Опрости `server/src/index.js`**

Замени цялото съдържание с:

```js
import { initSchema, db } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;

initSchema();

// Автоматично зареждане на примерни данни при първо стартиране
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  console.log('▸ Празна база – зареждам примерни данни...');
  seed();
}

createApp().listen(PORT, () => {
  console.log(`\n  ✔ Сървърът на „300 Триста – Обучения" работи на http://localhost:${PORT}\n`);
});
```

- [ ] **Step 4: Скрипт за тестове**

В `server/package.json`, в `"scripts"`, добави след `"seed"`:

```json
    "test": "node --no-warnings --test test/*.test.js"
```

(не забравяй запетаята след реда на `"seed"`).

- [ ] **Step 5: Помощни функции `server/test/helpers.js`**

```js
import bcrypt from 'bcryptjs';
import { db, initSchema } from '../src/db.js';
import { createApp } from '../src/app.js';

initSchema();

export async function startServer() {
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

export function makeClient(base) {
  let cookie = '';
  return async function call(method, path, body) {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };
}

// Добавя потребител направо в базата. Връща id.
export function addUser(f = {}) {
  const cols = {
    name: f.name ?? 'Тест', email: f.email ?? null, phone: f.phone ?? null,
    password_hash: bcrypt.hashSync(f.password ?? 'test123', 4), role: f.role ?? 'employee',
    store: f.store ?? null, mentor: f.mentor ?? null, is_mentor: f.is_mentor ?? 0,
    mentor_style: f.mentor_style ?? null, mentorship_done_at: f.mentorship_done_at ?? null,
  };
  const keys = Object.keys(cols);
  return Number(db.prepare(`INSERT INTO users (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
    .run(...Object.values(cols)).lastInsertRowid);
}

export { db };
```

Забележка: `addUser` ползва колоните `phone`, `mentor_style`, `mentorship_done_at` и `email = NULL`, които се появяват в Task 2. Затова в тази задача smoke тестът не вика `addUser`.

- [ ] **Step 6: Smoke тест `server/test/smoke.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

test('сървърът отговаря на /api/health', async () => {
  const srv = await startServer();
  try {
    const res = await fetch(srv.base + '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  } finally { await srv.close(); }
});
```

- [ ] **Step 7: Пусни тестовете**

Run: `npm --prefix server test`
Expected: `# pass 1`, `# fail 0`.

- [ ] **Step 8: Провери, че приложението още тръгва**

Run: `node --no-warnings server/src/index.js` (изчакай реда „Сървърът … работи“, после Ctrl+C / спри процеса).
Expected: няма грешка при стартиране.

- [ ] **Step 9: Commit**

```bash
git add server/src/db.js server/src/app.js server/src/index.js server/package.json server/test
git commit -m "Тестова основа: база в паметта при тестове, createApp(), npm test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Телефон + схема на базата (миграция, магазини, заявки)

**Files:**
- Create: `server/src/phone.js`
- Create: `server/src/stores.js`
- Modify: `server/src/db.js` (таблица `users`, нови таблици, `migrate()`)
- Test: `server/test/phone.test.js`, `server/test/migration.test.js`

**Interfaces:**
- Produces: `normalizePhone(s: any): string | null` от `server/src/phone.js` (`null` = невалиден/празен).
- Produces: `MISTRAL_STORES: Array<[locationId: number|null, name: string]>` и `ensureStores(db): void` от `server/src/stores.js`.
- Produces: колони `users.phone`, `users.mentor_style`, `users.mentorship_done_at`; `users.email` вече допуска NULL; таблици `stores(id, name UNIQUE, location_id, order_index)` и `disc_requests(id, name, phone, disc_result, disc_scores, suggested_mentor_id, status, user_id, decided_at, created_at)`.
- Produces: `rebuildUsersTable()` не се изнася — вика се вътрешно от `migrate()`.

- [ ] **Step 1: Failing тест за телефона — `server/test/phone.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../src/phone.js';

test('нормализира различни записи до 0XXXXXXXXX', () => {
  assert.equal(normalizePhone('0888 123 456'), '0888123456');
  assert.equal(normalizePhone('0888123456'), '0888123456');
  assert.equal(normalizePhone('+359888123456'), '0888123456');
  assert.equal(normalizePhone('359 888 123 456'), '0888123456');
  assert.equal(normalizePhone('00359888123456'), '0888123456');
  assert.equal(normalizePhone('(0888) 12-34-56'), '0888123456');
});

test('връща null за празен или невалиден номер', () => {
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone(undefined), null);
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('08881234567'), null); // 11 цифри
  assert.equal(normalizePhone('888123456'), null);   // без водеща 0
});
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '…/src/phone.js'`.

- [ ] **Step 3: `server/src/phone.js`**

```js
// Телефонът е потребителското име на служителите. Един номер – един запис,
// независимо дали е написан с интервали, +359 или 00359.
export function normalizePhone(s) {
  if (s == null) return null;
  let d = String(s).replace(/\D/g, '');
  if (d.startsWith('00359')) d = '0' + d.slice(5);
  else if (d.startsWith('359')) d = '0' + d.slice(3);
  return /^0\d{9}$/.test(d) ? d : null;
}
```

- [ ] **Step 4: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за двата теста в `phone.test.js`.

- [ ] **Step 5: `server/src/stores.js` — списъкът от Мистрал**

```js
// Обектите от Мистрал (таблица LOCATION, LOCATIONID → име). Без склада (13)
// и служебния обект „ДЪЩЕРНА БАЗА“ (52); 15 и 28 не са известни.
export const MISTRAL_STORES = [
  [null, 'ЦЕНТРАЛЕН ОФИС'],
  [14, 'АЛЕКС'], [16, 'БЕНКОВСКИ'], [17, 'БОЖУР'], [18, 'ВАРДАР'], [19, 'ВАРНЕНЧИК'],
  [20, 'ВЛАДИСЛАВ'], [21, 'ВЪЗРАЖДАНЕ'], [22, 'ГЕНЕРАЛИ'], [23, 'ГЪМЗА'], [24, 'ДУБРОВНИК'],
  [25, 'ИСКЪР'], [26, 'КАЛИТИН'], [27, 'КОЛХОЗА'], [29, 'МАКЕДОНИЯ'], [30, 'МАРИЦА'],
  [31, 'МЛАДОСТ'], [32, 'НЕПТУН'], [33, 'ОНИКС'], [34, 'ОХРИД'], [35, 'ПИРИН'],
  [36, 'ПОВЕЛЯНОВО'], [37, 'ПОДВИС'], [38, 'ПРИМОРСКИ'], [39, 'РИЛА'], [40, 'СТРАНДЖА'],
  [41, 'ТОДОРКА'], [42, 'ТОПОЛИ'], [43, 'ТРАКИЯ'], [44, 'ТУНДЖА'], [45, 'ХЕБЪР'],
  [46, 'ЧАТАЛДЖА'], [47, 'ЧИФЛИКА'], [48, 'ШИПКА'], [49, 'ЯНТРА'], [50, 'САКАР'],
  [51, 'МАДЖЕСТИК'], [53, 'ЦАРЕВЕЦ'], [54, 'БАЛКАН'], [55, 'КАМЧИЯ'], [56, 'БОРОВЕЦ'],
  [57, 'ДОМИНГО'], [58, 'МИР'], [59, 'СОЛУН'], [60, 'РОЗА'], [61, 'ВИНИЦА'],
  [62, 'АНДЖИ'], [63, 'МИЗИЯ'], [64, 'ЛАВРЕНТИЙ'], [65, 'ТРОШЕВО'], [66, 'НАДЕЖДА'],
  [67, 'БИТОЛЯ'], [68, 'БЕЛОСЛАВ'], [69, 'ГАЛАТА'],
];

// Попълва списъка само ако е празен – след това го поддържа управителят.
export function ensureStores(db) {
  if (db.prepare('SELECT COUNT(*) n FROM stores').get().n > 0) return;
  const ins = db.prepare('INSERT INTO stores (name, location_id, order_index) VALUES (?, ?, ?)');
  MISTRAL_STORES.forEach(([loc, name], i) => ins.run(name, loc, i));
}
```

- [ ] **Step 6: Failing тест за миграцията — `server/test/migration.test.js`**

Тестът създава „стара“ таблица `users` (email NOT NULL, без новите колони), слага потребител и прогрес, пуска `initSchema()` и проверява, че нищо не е загубено.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db, initSchema } from '../src/db.js';

test('стара база: email става незадължителен, редовете и прогресът остават', () => {
  // „Стара“ схема отпреди тази промяна
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee', store TEXT, position TEXT,
      mentor TEXT, start_date TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, icon TEXT NOT NULL, description TEXT, order_index INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE modules (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE, title TEXT NOT NULL, summary TEXT, content TEXT, video_url TEXT, order_index INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'not_started', score INTEGER, completed_at TEXT, updated_at TEXT DEFAULT (datetime('now')), UNIQUE (user_id, module_id));
    INSERT INTO users (id, name, email, password_hash, role, store) VALUES (7, 'Стар Служител', 'star@triesta.bg', 'h', 'employee', 'Магазин Люлин');
    INSERT INTO categories (id, slug, title, icon) VALUES (1, 'c', 'К', 'store');
    INSERT INTO modules (id, category_id, title) VALUES (1, 1, 'М');
    INSERT INTO progress (user_id, module_id, status, score) VALUES (7, 1, 'completed', 90);
  `);

  initSchema();

  const cols = db.prepare('PRAGMA table_info(users)').all();
  const email = cols.find((c) => c.name === 'email');
  assert.equal(email.notnull, 0, 'email трябва да допуска NULL');
  for (const c of ['phone', 'mentor_style', 'mentorship_done_at', 'is_mentor', 'disc_result'])
    assert.ok(cols.some((x) => x.name === c), `липсва колона ${c}`);

  const u = db.prepare('SELECT * FROM users WHERE id = 7').get();
  assert.equal(u.name, 'Стар Служител');
  assert.equal(u.email, 'star@triesta.bg');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM progress WHERE user_id = 7').get().n, 1);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);

  // служител без имейл вече може да се запише; дублиран телефон – не
  db.prepare("INSERT INTO users (name, phone, password_hash) VALUES ('Нов', '0888123456', 'h')").run();
  assert.throws(() => db.prepare("INSERT INTO users (name, phone, password_hash) VALUES ('Друг', '0888123456', 'h')").run());

  // магазините от Мистрал са заредени; втори initSchema не ги дублира
  const n = db.prepare('SELECT COUNT(*) n FROM stores').get().n;
  assert.ok(n >= 50);
  assert.ok(db.prepare("SELECT 1 FROM stores WHERE name = 'ДУБРОВНИК' AND location_id = 24").get());
  initSchema();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM stores').get().n, n);

  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='disc_requests'").get());
});
```

- [ ] **Step 7: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL в `migration.test.js` (`email трябва да допуска NULL` или липсваща таблица `stores`).

- [ ] **Step 8: Промени `server/src/db.js`**

8a. Най-горе добави импорт: `import { ensureStores } from './stores.js';`

8b. Над `export function initSchema()` добави константа със схемата на `users` (единственият източник за новите бази и за пресъздаването):

```js
// Схемата на users – ползва се и при първо създаване, и при пресъздаване на стара таблица.
const USERS_COLUMNS = `
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE,                         -- само за управители е задължителен
      phone         TEXT,                                -- нормализиран (0XXXXXXXXX); вход за служителите
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'employee',   -- 'employee' | 'manager'
      store         TEXT,
      position      TEXT,
      mentor        TEXT,
      start_date    TEXT,
      is_mentor     INTEGER NOT NULL DEFAULT 0,
      mentor_style  TEXT,                                -- DISC стил на ментора: D | I | S | C
      mentorship_done_at TEXT,                           -- кога е завършил при ментора си (NULL = в обучение)
      feedback_rating REAL,                              -- оценка от обучените (1–5)
      retention_rate  INTEGER,                           -- задържане на обучените след 3 месеца (%)
      disc_result   TEXT,                                -- резултат от DISC теста: D | I | S | C
      disc_taken_at TEXT,
      seen_welcome  INTEGER NOT NULL DEFAULT 0,          -- видял ли е приветствения екран
      created_at    TEXT DEFAULT (datetime('now'))`;
```

8c. В `initSchema()` замени целия блок `CREATE TABLE IF NOT EXISTS users ( … );` с:

```js
    CREATE TABLE IF NOT EXISTS users (${USERS_COLUMNS}
    );
```

(шаблонният низ на `db.exec` вече е с обратни кавички, така че `${USERS_COLUMNS}` работи.)

8d. В същия `db.exec` след таблицата `progress` добави:

```sql
    CREATE TABLE IF NOT EXISTS stores (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      location_id INTEGER,                         -- LOCATIONID в Мистрал
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS disc_requests (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT NOT NULL,
      phone               TEXT NOT NULL,          -- нормализиран
      disc_result         TEXT NOT NULL,          -- D | I | S | C
      disc_scores         TEXT,                   -- JSON {D,I,S,C}
      suggested_mentor_id INTEGER,
      status              TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      user_id             INTEGER,                -- създаденият акаунт при одобрение
      decided_at          TEXT,
      created_at          TEXT DEFAULT (datetime('now'))
    );
```

8e. Замени `migrate()` с:

```js
// Добавя нови колони към стари бази, без да губи данни.
function migrate() {
  const addCol = (table, name, ddl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  addCol('users', 'is_mentor', 'is_mentor INTEGER NOT NULL DEFAULT 0');
  addCol('users', 'feedback_rating', 'feedback_rating REAL');
  addCol('users', 'retention_rate', 'retention_rate INTEGER');
  addCol('users', 'disc_result', 'disc_result TEXT');
  addCol('users', 'disc_taken_at', 'disc_taken_at TEXT');
  addCol('users', 'seen_welcome', 'seen_welcome INTEGER NOT NULL DEFAULT 0');
  addCol('users', 'phone', 'phone TEXT');
  addCol('users', 'mentor_style', 'mentor_style TEXT');
  addCol('users', 'mentorship_done_at', 'mentorship_done_at TEXT');
  addCol('modules', 'duration', 'duration INTEGER');

  // Стари бази имат email NOT NULL – служителите вече влизат с телефон.
  const email = db.prepare('PRAGMA table_info(users)').all().find((c) => c.name === 'email');
  if (email?.notnull) rebuildUsersTable();

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_phone ON users(phone) WHERE phone IS NOT NULL');
  ensureStores(db);
}

// SQLite не може да махне NOT NULL с ALTER – пресъздаваме таблицата, като пазим id-тата.
function rebuildUsersTable() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name).join(', ');
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN');
    db.exec(`CREATE TABLE users_new (${USERS_COLUMNS}\n)`);
    db.exec(`INSERT INTO users_new (${cols}) SELECT ${cols} FROM users`);
    db.exec('DROP TABLE users');
    db.exec('ALTER TABLE users_new RENAME TO users');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}
```

(Към момента на `rebuildUsersTable()` всички колони от `USERS_COLUMNS` вече съществуват в старата таблица, защото `addCol` е минал преди това — затова `INSERT … SELECT` със списъка на старите колони копира всичко.)

- [ ] **Step 9: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички тестове (smoke, phone, migration).

- [ ] **Step 10: Провери истинската база на компютъра**

Run: `node --no-warnings -e "import('./server/src/db.js').then(m=>{m.initSchema();console.log(m.db.prepare('SELECT COUNT(*) n FROM users').get(), m.db.prepare('SELECT COUNT(*) n FROM stores').get())})"`
Expected: броят потребители е същият като преди (11 при примерните данни), магазините са 54.

- [ ] **Step 11: Commit**

```bash
git add server/src/phone.js server/src/stores.js server/src/db.js server/test/phone.test.js server/test/migration.test.js
git commit -m "База: телефон за вход, незадължителен имейл, магазини от Мистрал, таблица за DISC заявки

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Магазини — API за управителя

**Files:**
- Create: `server/src/routes/stores.js`
- Modify: `server/src/app.js` (монтиране)
- Test: `server/test/stores.test.js`

**Interfaces:**
- Consumes: таблица `stores` (Task 2), `requireManager` от `server/src/auth.js`, `addUser`/`startServer`/`makeClient` (Task 1).
- Produces: `GET /api/admin/stores` → `{ stores: [{ id, name, location_id, people }] }` (подредени по `order_index, name`); `POST /api/admin/stores {name, location_id?}` → `{ id }`; `PUT /api/admin/stores/:id {name, location_id?}` → `{ ok }`; `DELETE /api/admin/stores/:id` → `{ ok }`.
- Produces: `storeExists(name): boolean` от `server/src/routes/stores.js` (именуван export, ползва се в Task 8).

- [ ] **Step 1: Failing тест `server/test/stores.test.js`**

```js
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
```

Забележка: тестът влиза с `{ login, … }` — това поле се добавя в Task 6. Дотогава в `server/src/routes/auth.js` входът приема само `email`, затова в **тази** задача направи и минималната промяна на входа от Step 3 по-долу.

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL в `stores.test.js` (404 за `/admin/stores` или 400 при входа).

- [ ] **Step 3: Вход с поле `login` (имейл засега)**

В `server/src/routes/auth.js` замени началото на `router.post('/login', …)` до `if (!user …` с:

```js
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  const login = String(req.body?.login ?? req.body?.email ?? '').trim();
  if (!login || !password)
    return res.status(400).json({ error: 'Въведи телефон или имейл и парола.' });

  const user = findUserByLogin(login);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Грешен телефон/имейл или парола.' });
```

и добави под `router` функцията (телефонът се добавя в Task 6):

```js
// Имейл, ако има „@“; иначе – телефон (Task 6).
function findUserByLogin(login) {
  if (login.includes('@')) return db.prepare('SELECT * FROM users WHERE email = ?').get(login.toLowerCase());
  return null;
}
```

- [ ] **Step 4: `server/src/routes/stores.js`**

```js
import { Router } from 'express';
import { requireManager } from '../auth.js';
import { db } from '../db.js';

// Списък с магазините (обектите от Мистрал). Само за управители.
const router = Router();
router.use(requireManager);

export function storeExists(name) {
  return !!db.prepare('SELECT 1 FROM stores WHERE name = ?').get(name);
}

function readBody(body) {
  const name = String(body?.name || '').trim();
  const loc = body?.location_id;
  const location_id = loc === '' || loc == null ? null : Number(loc);
  return { name, location_id: Number.isFinite(location_id) ? location_id : null };
}

router.get('/', (_req, res) => {
  const stores = db.prepare(`
    SELECT s.id, s.name, s.location_id, (SELECT COUNT(*) FROM users u WHERE u.store = s.name) AS people
    FROM stores s ORDER BY s.order_index, s.name`).all();
  res.json({ stores });
});

router.post('/', (req, res) => {
  const { name, location_id } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'Въведи име на магазина.' });
  if (storeExists(name)) return res.status(409).json({ error: 'Вече има магазин с това име.' });
  const order = db.prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM stores').get().n;
  const id = db.prepare('INSERT INTO stores (name, location_id, order_index) VALUES (?, ?, ?)').run(name, location_id, order).lastInsertRowid;
  res.json({ id: Number(id) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: 'Магазинът не е намерен.' });
  const { name, location_id } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'Въведи име на магазина.' });
  if (db.prepare('SELECT 1 FROM stores WHERE name = ? AND id != ?').get(name, id))
    return res.status(409).json({ error: 'Вече има магазин с това име.' });
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE stores SET name = ?, location_id = ? WHERE id = ?').run(name, location_id, id);
    db.prepare('UPDATE users SET store = ? WHERE store = ?').run(name, old.name);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM stores WHERE id = ?').get(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Магазинът не е намерен.' });
  if (db.prepare('SELECT 1 FROM users WHERE store = ?').get(s.name))
    return res.status(409).json({ error: 'Магазинът има служители – първо ги премести.' });
  db.prepare('DELETE FROM stores WHERE id = ?').run(s.id);
  res.json({ ok: true });
});

export default router;
```

- [ ] **Step 5: Монтирай в `server/src/app.js`**

Добави импорт `import storesRoutes from './routes/stores.js';` и **преди** реда `app.use('/api/admin', adminRoutes);` добави:

```js
  app.use('/api/admin/stores', storesRoutes);
```

- [ ] **Step 6: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/stores.js server/src/routes/auth.js server/src/app.js server/test/stores.test.js
git commit -m "Магазини: списък, добавяне, преименуване (мести и хората), защита при изтриване

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Избор на ментор

**Files:**
- Create: `server/src/mentorMatch.js`
- Test: `server/test/mentorMatch.test.js`

**Interfaces:**
- Produces от `server/src/mentorMatch.js`:
  - `activeMenteeCount(mentorName: string): number`
  - `listMentors(): Array<{ id, name, store, mentor_style, active }>` — всички `is_mentor=1`, подредени по име.
  - `suggestMentor(style: 'D'|'I'|'S'|'C'): { id, name, store, mentor_style, active } | null`

- [ ] **Step 1: Failing тест `server/test/mentorMatch.test.js`**

```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { addUser, db } from './helpers.js';
import { suggestMentor, activeMenteeCount, listMentors } from '../src/mentorMatch.js';

beforeEach(() => db.exec('DELETE FROM users'));

test('избира ментора със същия стил и най-малко активни обучаеми', () => {
  addUser({ name: 'Борис', is_mentor: 1, mentor_style: 'D', store: 'ШИПКА', phone: '0888000001' });
  addUser({ name: 'Ана', is_mentor: 1, mentor_style: 'D', store: 'САКАР', phone: '0888000002' });
  addUser({ name: 'Ива', is_mentor: 1, mentor_style: 'I', store: 'МИР', phone: '0888000003' });
  addUser({ name: 'Обучаем 1', mentor: 'Ана', phone: '0888000011' });
  const m = suggestMentor('D');
  assert.equal(m.name, 'Борис');
  assert.equal(m.store, 'ШИПКА');
  assert.equal(m.active, 0);
});

test('завършилите не се броят към натовареността', () => {
  addUser({ name: 'Ана', is_mentor: 1, mentor_style: 'S', phone: '0888000002' });
  addUser({ name: 'Борис', is_mentor: 1, mentor_style: 'S', phone: '0888000001' });
  addUser({ name: 'Стар', mentor: 'Ана', mentorship_done_at: '2026-01-01', phone: '0888000011' });
  addUser({ name: 'Нов', mentor: 'Борис', phone: '0888000012' });
  assert.equal(activeMenteeCount('Ана'), 0);
  assert.equal(activeMenteeCount('Борис'), 1);
  assert.equal(suggestMentor('S').name, 'Ана');
});

test('при равенство – по азбучен ред', () => {
  addUser({ name: 'Яна', is_mentor: 1, mentor_style: 'C', phone: '0888000001' });
  addUser({ name: 'Вера', is_mentor: 1, mentor_style: 'C', phone: '0888000002' });
  assert.equal(suggestMentor('C').name, 'Вера');
});

test('няма ментор с този стил → null', () => {
  addUser({ name: 'Ива', is_mentor: 1, mentor_style: 'I', phone: '0888000003' });
  assert.equal(suggestMentor('D'), null);
});

test('listMentors връща всички ментори с натовареност', () => {
  addUser({ name: 'Ива', is_mentor: 1, mentor_style: 'I', store: 'МИР', phone: '0888000003' });
  addUser({ name: 'Обучаем', mentor: 'Ива', phone: '0888000011' });
  addUser({ name: 'Не е ментор', phone: '0888000012' });
  assert.deepEqual(listMentors().map((m) => [m.name, m.store, m.mentor_style, m.active]), [['Ива', 'МИР', 'I', 1]]);
});
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '…/src/mentorMatch.js'`.

- [ ] **Step 3: `server/src/mentorMatch.js`**

```js
import { db } from './db.js';

// Активен обучаем = служител с този ментор, който още не е маркиран „Завършил“.
export function activeMenteeCount(mentorName) {
  return db.prepare(`SELECT COUNT(*) n FROM users
    WHERE role = 'employee' AND mentor = ? AND mentorship_done_at IS NULL`).get(mentorName).n;
}

export function listMentors() {
  return db.prepare('SELECT id, name, store, mentor_style FROM users WHERE is_mentor = 1 ORDER BY name').all()
    .map((m) => ({ ...m, active: activeMenteeCount(m.name) }));
}

// Ментор със същия DISC стил и най-малко активни обучаеми; при равенство – по име.
export function suggestMentor(style) {
  const same = listMentors().filter((m) => m.mentor_style === style);
  if (!same.length) return null;
  same.sort((a, b) => a.active - b.active || a.name.localeCompare(b.name, 'bg'));
  return same[0];
}
```

- [ ] **Step 4: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 5: Commit**

```bash
git add server/src/mentorMatch.js server/test/mentorMatch.test.js
git commit -m "Избор на ментор: същият DISC стил, най-малко активни обучаеми

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Публичен DISC тест (без вход)

**Files:**
- Create: `server/src/routes/publicDisc.js`
- Modify: `server/src/app.js` (монтиране)
- Test: `server/test/publicDisc.test.js`

**Interfaces:**
- Consumes: `DISC_QUESTIONS`, `scoreDisc(answers: {[qid]: 'D'|'I'|'S'|'C'})` от `server/src/disc.js`; `normalizePhone` (Task 2); `suggestMentor` (Task 4).
- Produces:
  - `GET /api/public/disc` → `{ questions: [{ id, text, options: [{ text }] }] }` (без `style`).
  - `POST /api/public/disc/check {phone}` → `{ ok: true }` | 400 (невалиден телефон) | 409 (вече има заявка/акаунт).
  - `POST /api/public/disc {name, phone, answers: {[qid]: optionIndex 0–3}}` → `{ ok: true }` | 400 | 409. Записва `disc_requests` със `status='pending'`, `disc_result`, `disc_scores` (JSON), `suggested_mentor_id` (или NULL).

- [ ] **Step 1: Failing тест `server/test/publicDisc.test.js`**

```js
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
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL (404 за `/public/disc`).

- [ ] **Step 3: `server/src/routes/publicDisc.js`**

```js
import { Router } from 'express';
import { db } from '../db.js';
import { DISC_QUESTIONS, scoreDisc } from '../disc.js';
import { normalizePhone } from '../phone.js';
import { suggestMentor } from '../mentorMatch.js';

// Публичен DISC тест за одобрени на интервю кандидати (общ QR код). Без вход.
// Кандидатът не вижда резултата – той отива само при управителя.
const router = Router();

const DUPLICATE = 'Вече имате подадена заявка. Управителят ще се свърже с вас.';

function phoneTaken(phone) {
  return !!(db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone)
    || db.prepare("SELECT 1 FROM disc_requests WHERE phone = ? AND status = 'pending'").get(phone));
}

router.get('/', (_req, res) => {
  res.json({
    questions: DISC_QUESTIONS.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => ({ text: o.text })) })),
  });
});

router.post('/check', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Въведи валиден телефон (напр. 0888 123 456).' });
  if (phoneTaken(phone)) return res.status(409).json({ error: DUPLICATE });
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: 'Въведи име и фамилия.' });
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Въведи валиден телефон (напр. 0888 123 456).' });

  // индекс на отговора → стил (клиентът не знае стиловете)
  const raw = req.body?.answers || {};
  const answers = {};
  for (const q of DISC_QUESTIONS) {
    const opt = q.options[Number(raw[q.id])];
    if (raw[q.id] === undefined || raw[q.id] === null || !opt) return res.status(400).json({ error: 'Отговори на всички въпроси.' });
    answers[q.id] = opt.style;
  }

  if (phoneTaken(phone)) return res.status(409).json({ error: DUPLICATE });

  const { scores, primary } = scoreDisc(answers);
  const mentor = suggestMentor(primary);
  db.prepare(`INSERT INTO disc_requests (name, phone, disc_result, disc_scores, suggested_mentor_id)
              VALUES (?, ?, ?, ?, ?)`).run(name, phone, primary, JSON.stringify(scores), mentor?.id ?? null);
  res.json({ ok: true });
});

export default router;
```

- [ ] **Step 4: Монтирай в `server/src/app.js`**

Добави импорт `import publicDiscRoutes from './routes/publicDisc.js';` и след `app.use('/api/apply', applyRoutes);`:

```js
  app.use('/api/public/disc', publicDiscRoutes); // публичен – без вход
```

- [ ] **Step 5: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/publicDisc.js server/src/app.js server/test/publicDisc.test.js
git commit -m "Публичен DISC тест: заявка с предложен ментор, без показване на резултата

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Заявки при управителя — одобрение, отказ, вход с телефон

**Files:**
- Create: `server/src/routes/discRequests.js`
- Modify: `server/src/app.js` (монтиране)
- Modify: `server/src/routes/auth.js` (вход с телефон, `phone` в `publicUser`)
- Modify: `server/src/auth.js:28` (`phone` в `attachUser`)
- Test: `server/test/discRequests.test.js`

**Interfaces:**
- Consumes: `listMentors`, `activeMenteeCount` (Task 4); `normalizePhone` (Task 2); таблица `disc_requests` (Task 2).
- Produces:
  - `GET /api/manager/disc-requests` → `{ pending: Req[], history: Req[], mentors: listMentors() }`, където `Req = { id, name, phone, disc_result, created_at, status, decided_at, user_id, suggested_mentor: { id, name, store, mentor_style, active } | null }`. `history` = последните 50 одобрени/отказани, най-новите първо.
  - `GET /api/manager/disc-requests/count` → `{ pending: number }`.
  - `POST /api/manager/disc-requests/:id/approve {mentorId}` → `{ userId, name, phone, password }` | 400 | 404 | 409.
  - `POST /api/manager/disc-requests/:id/reject` → `{ ok }` | 404 | 409.
  - Вход: `POST /api/auth/login {login, password}` — `login` е имейл (ако има `@`) или телефон във всякакъв запис.
  - `genPassword(): string` (вътрешна за файла).

- [ ] **Step 1: Failing тест `server/test/discRequests.test.js`**

```js
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
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL в `discRequests.test.js`.

- [ ] **Step 3: Вход с телефон — `server/src/routes/auth.js`**

Добави импорт `import { normalizePhone } from '../phone.js';` и замени `findUserByLogin` с:

```js
// Имейл, ако има „@“; иначе – телефон във всякакъв запис (0888…, +359…, с интервали).
function findUserByLogin(login) {
  if (login.includes('@')) return db.prepare('SELECT * FROM users WHERE email = ?').get(login.toLowerCase());
  const phone = normalizePhone(login);
  return phone ? db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) : null;
}
```

В `publicUser` добави `phone: u.phone,` след `email: u.email,`.

- [ ] **Step 4: `phone` в текущия потребител — `server/src/auth.js`**

В `attachUser` замени списъка в SELECT с:

```js
        .prepare('SELECT id, name, email, phone, role, store, position, mentor, start_date, seen_welcome, disc_result FROM users WHERE id = ?')
```

- [ ] **Step 5: `server/src/routes/discRequests.js`**

```js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { requireManager } from '../auth.js';
import { db } from '../db.js';
import { listMentors, activeMenteeCount } from '../mentorMatch.js';

// Заявки от публичния DISC тест – чакат одобрение от управителя.
const router = Router();
router.use(requireManager);

// Без объркващи знаци (0/O, 1/l/I), за да се продиктува лесно.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function genPassword() {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

function view(r) {
  const m = r.suggested_mentor_id
    ? db.prepare('SELECT id, name, store, mentor_style FROM users WHERE id = ? AND is_mentor = 1').get(r.suggested_mentor_id)
    : null;
  return {
    id: r.id, name: r.name, phone: r.phone, disc_result: r.disc_result, created_at: r.created_at,
    status: r.status, decided_at: r.decided_at, user_id: r.user_id,
    suggested_mentor: m ? { ...m, active: activeMenteeCount(m.name) } : null,
  };
}

router.get('/', (_req, res) => {
  const pending = db.prepare("SELECT * FROM disc_requests WHERE status = 'pending' ORDER BY created_at, id").all().map(view);
  const history = db.prepare("SELECT * FROM disc_requests WHERE status != 'pending' ORDER BY decided_at DESC, id DESC LIMIT 50").all().map(view);
  res.json({ pending, history, mentors: listMentors() });
});

router.get('/count', (_req, res) => {
  res.json({ pending: db.prepare("SELECT COUNT(*) n FROM disc_requests WHERE status = 'pending'").get().n });
});

router.post('/:id/approve', (req, res) => {
  const r = db.prepare('SELECT * FROM disc_requests WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Заявката не е намерена.' });
  if (r.status !== 'pending') return res.status(409).json({ error: 'Заявката вече е обработена.' });
  const mentor = db.prepare('SELECT id, name, store FROM users WHERE id = ? AND is_mentor = 1').get(Number(req.body?.mentorId));
  if (!mentor) return res.status(400).json({ error: 'Избери ментор.' });
  if (db.prepare('SELECT 1 FROM users WHERE phone = ?').get(r.phone))
    return res.status(409).json({ error: 'Вече има служител с този телефон.' });

  const password = genPassword();
  const hash = bcrypt.hashSync(password, 10);
  let userId;
  db.exec('BEGIN IMMEDIATE');
  try {
    // повторна проверка вътре в транзакцията – срещу двоен клик
    const claimed = db.prepare("UPDATE disc_requests SET status = 'approved', decided_at = datetime('now') WHERE id = ? AND status = 'pending'").run(r.id);
    if (claimed.changes !== 1) { db.exec('ROLLBACK'); return res.status(409).json({ error: 'Заявката вече е обработена.' }); }
    userId = Number(db.prepare(`INSERT INTO users (name, email, phone, password_hash, role, store, mentor, start_date, disc_result, disc_taken_at)
      VALUES (?, NULL, ?, ?, 'employee', ?, ?, date('now'), ?, ?)`)
      .run(r.name, r.phone, hash, mentor.store, mentor.name, r.disc_result, r.created_at).lastInsertRowid);
    db.prepare('UPDATE disc_requests SET user_id = ? WHERE id = ?').run(userId, r.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  res.json({ userId, name: r.name, phone: r.phone, password });
});

router.post('/:id/reject', (req, res) => {
  const r = db.prepare('SELECT * FROM disc_requests WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Заявката не е намерена.' });
  const done = db.prepare("UPDATE disc_requests SET status = 'rejected', decided_at = datetime('now') WHERE id = ? AND status = 'pending'").run(r.id);
  if (done.changes !== 1) return res.status(409).json({ error: 'Заявката вече е обработена.' });
  res.json({ ok: true });
});

export default router;
```

Забележка за двойния клик: `bcrypt.hashSync` е синхронен, а целият обработчик е синхронен, така че Node обслужва двете заявки една след друга; вторият `UPDATE … WHERE status = 'pending'` не променя нищо → 409. `BEGIN IMMEDIATE` пази и при бъдещо разделяне на процеси.

- [ ] **Step 6: Монтирай в `server/src/app.js`**

Добави импорт `import discRequestsRoutes from './routes/discRequests.js';` и **преди** `app.use('/api/manager', managerRoutes);`:

```js
  app.use('/api/manager/disc-requests', discRequestsRoutes);
```

- [ ] **Step 7: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/discRequests.js server/src/routes/auth.js server/src/auth.js server/src/app.js server/test/discRequests.test.js
git commit -m "Заявки: одобрение създава служител (вход с телефон, временна парола), отказ, брояч

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ментори — стил, магазин, текущи обучаеми, „Завършил“

**Files:**
- Modify: `server/src/routes/manager.js:54-90` (маршрут `/mentors`) + нов маршрут `/mentees/:id/complete`
- Test: `server/test/mentors.test.js`

**Interfaces:**
- Consumes: колони `mentor_style`, `mentorship_done_at` (Task 2).
- Produces: всеки елемент на `GET /api/manager/mentors` → `mentors[]` получава допълнително `mentor_style`, `active` (брой), `activeList: [{ id, name, store, start_date }]`, `doneList: [{ id, name, mentorship_done_at }]`; `stats.totalActive`. Всички съществуващи полета остават.
- Produces: `POST /api/manager/mentees/:id/complete` → `{ ok }` | 404 | 409.

- [ ] **Step 1: Failing тест `server/test/mentors.test.js`**

```js
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

test('„Завършил“ маха човека от активните; повторно → 409; непознат → 404', async () => {
  assert.equal((await mgr('POST', `/manager/mentees/${peso}/complete`)).status, 200);
  assert.ok(db.prepare('SELECT mentorship_done_at FROM users WHERE id = ?').get(peso).mentorship_done_at);
  const { data } = await mgr('GET', '/manager/mentors');
  const m = data.mentors.find((x) => x.name === 'Дим Ментор');
  assert.equal(m.active, 0);
  assert.equal(m.doneList.length, 2);
  assert.equal((await mgr('POST', `/manager/mentees/${peso}/complete`)).status, 409);
  assert.equal((await mgr('POST', '/manager/mentees/99999/complete')).status, 404);
});
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL в `mentors.test.js` (`mentor_style` е undefined).

- [ ] **Step 3: Промени `/mentors` в `server/src/routes/manager.js`**

3a. В първия SELECT на `/mentors` добави `mentor_style`:

```js
  const mentors = db.prepare("SELECT id, name, store, position, mentor_style, feedback_rating, retention_rate FROM users WHERE is_mentor = 1 ORDER BY name").all();
```

3b. Замени реда `const mentees = db.prepare("SELECT id, name, position FROM users WHERE mentor = ? …` с:

```js
    const mentees = db.prepare("SELECT id, name, position, store, start_date, mentorship_done_at FROM users WHERE mentor = ? AND role = 'employee' AND id != ?").all(mtr.name, mtr.id);
    const activeList = mentees.filter((e) => !e.mentorship_done_at).map((e) => ({ id: e.id, name: e.name, store: e.store, start_date: e.start_date }));
    const doneList = mentees.filter((e) => e.mentorship_done_at).map((e) => ({ id: e.id, name: e.name, mentorship_done_at: e.mentorship_done_at }));
```

3c. В обекта, който се връща за всеки ментор, замени `id: mtr.id, name: mtr.name, store: mtr.store, position: mtr.position,` с:

```js
      id: mtr.id, name: mtr.name, store: mtr.store, position: mtr.position, mentor_style: mtr.mentor_style,
      active: activeList.length, activeList, doneList,
```

3d. В `stats` добави след `totalMentees: …,`:

```js
      totalActive: rows.reduce((s, r) => s + r.active, 0),
```

3e. След маршрута `/mentors` добави:

```js
// Управителят маркира, че служителят е завършил обучението при ментора си.
router.post('/mentees/:id/complete', (req, res) => {
  const u = db.prepare("SELECT id, mentor, mentorship_done_at FROM users WHERE id = ? AND role = 'employee' AND mentor IS NOT NULL").get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Служителят не е намерен.' });
  if (u.mentorship_done_at) return res.status(409).json({ error: 'Вече е маркиран като завършил.' });
  db.prepare("UPDATE users SET mentorship_done_at = datetime('now') WHERE id = ?").run(u.id);
  res.json({ ok: true });
});
```

- [ ] **Step 4: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/manager.js server/test/mentors.test.js
git commit -m "Ментори: стил, текущи и завършили обучаеми, бутон „Завършил“

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Служители — телефон, стил на ментора, магазин от списъка

**Files:**
- Modify: `server/src/routes/admin.js:245-301` (`publicUser`, `POST /users`, `PUT /users/:id`)
- Test: `server/test/adminUsers.test.js`

**Interfaces:**
- Consumes: `normalizePhone` (Task 2), `storeExists` (Task 3).
- Produces: `GET /api/admin/users` → всеки потребител има и `phone`, `mentor_style`. `POST`/`PUT /api/admin/users` приемат `phone`, `mentor_style` и валидират по правилата от Global Constraints.
- Produces: `cleanUser(body, id|null): { error } | { value }` (вътрешна за `admin.js`).

- [ ] **Step 1: Failing тест `server/test/adminUsers.test.js`**

```js
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
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL в `adminUsers.test.js`.

- [ ] **Step 3: Промени `server/src/routes/admin.js`**

3a. Импорти най-горе:

```js
import { normalizePhone } from '../phone.js';
import { storeExists } from './stores.js';
```

3b. В `publicUser` добави `phone: u.phone, mentor_style: u.mentor_style,` след `email: u.email,`.

3c. Над `router.get('/users', …)` добави общата проверка:

```js
const STYLES = ['D', 'I', 'S', 'C'];
const numOrNull = (v) => (v != null && v !== '' ? Number(v) : null);

// Проверява и изчиства данните за потребител. id = null при нов.
function cleanUser(u, id) {
  if (!u.name?.trim()) return { error: 'Въведи име.' };
  const role = u.role === 'manager' ? 'manager' : 'employee';
  const email = String(u.email || '').trim().toLowerCase() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Въведи валиден имейл.' };
  if (role === 'manager' && !email) return { error: 'Управителят влиза с имейл – въведи имейл.' };
  const phoneRaw = String(u.phone || '').trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: 'Въведи валиден телефон (напр. 0888 123 456).' };
  if (role === 'employee' && !phone) return { error: 'Служителят влиза с телефон – въведи телефон.' };
  if (email && db.prepare('SELECT 1 FROM users WHERE email = ? AND id IS NOT ?').get(email, id))
    return { error: 'Друг потребител вече ползва този имейл.' };
  if (phone && db.prepare('SELECT 1 FROM users WHERE phone = ? AND id IS NOT ?').get(phone, id))
    return { error: 'Друг потребител вече ползва този телефон.' };
  const store = String(u.store || '').trim() || null;
  if (store && !storeExists(store)) return { error: 'Избери магазин от списъка.' };
  const is_mentor = u.is_mentor ? 1 : 0;
  const mentor_style = is_mentor ? (STYLES.includes(u.mentor_style) ? u.mentor_style : null) : null;
  if (is_mentor && !mentor_style) return { error: 'Избери DISC стил на ментора.' };
  if (is_mentor && !store) return { error: 'Менторът трябва да има магазин.' };
  return {
    value: {
      name: u.name.trim(), email, phone, role, store,
      position: (u.position || '').trim() || null, mentor: (u.mentor || '').trim() || null,
      start_date: (u.start_date || '').trim() || null, is_mentor, mentor_style,
      feedback_rating: numOrNull(u.feedback_rating), retention_rate: numOrNull(u.retention_rate),
    },
  };
}
```

3d. Замени целия `router.post('/users', …)` с:

```js
router.post('/users', (req, res) => {
  const c = cleanUser(req.body || {}, null);
  if (c.error) return res.status(400).json({ error: c.error });
  const pw = req.body?.password;
  if (!pw || String(pw).length < 6) return res.status(400).json({ error: 'Паролата трябва да е поне 6 знака.' });
  const v = c.value;
  const id = db.prepare(`INSERT INTO users (name, email, phone, password_hash, role, store, position, mentor, start_date, is_mentor, mentor_style, feedback_rating, retention_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    v.name, v.email, v.phone, bcrypt.hashSync(String(pw), 10), v.role, v.store, v.position, v.mentor,
    v.start_date, v.is_mentor, v.mentor_style, v.feedback_rating, v.retention_rate,
  ).lastInsertRowid;
  res.json({ id: Number(id) });
});
```

3e. В `router.put('/users/:id', …)` замени всичко от `const u = req.body || {};` до края на `db.prepare(\`UPDATE users SET name=?…\`).run(…);` (включително) с:

```js
  const u = req.body || {};
  const c = cleanUser(u, id);
  if (c.error) return res.status(400).json({ error: c.error });
  if (u.password && String(u.password).length < 6) return res.status(400).json({ error: 'Паролата трябва да е поне 6 знака.' });
  const v = c.value;
  db.prepare(`UPDATE users SET name=?, email=?, phone=?, role=?, store=?, position=?, mentor=?, start_date=?, is_mentor=?, mentor_style=?, feedback_rating=?, retention_rate=? WHERE id=?`).run(
    v.name, v.email, v.phone, v.role, v.store, v.position, v.mentor, v.start_date,
    v.is_mentor, v.mentor_style, v.feedback_rating, v.retention_rate, id,
  );
```

и в блока за смяна на парола махни вече излишната проверка за дължина (остави само `if (u.password) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(u.password), 10), id);`). Проверката е преместена преди UPDATE, за да не се запише половин редакция.

- [ ] **Step 4: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/admin.js server/test/adminUsers.test.js
git commit -m "Служители: телефон за вход, стил на ментора, магазин само от списъка

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Примерни данни — реални магазини, 8 ментора, телефони, заявки

**Files:**
- Modify: `server/src/seed.js` (масив `USERS`, `seed()`)
- Test: `server/test/seed.test.js`

**Interfaces:**
- Consumes: `suggestMentor` (Task 4), `ensureStores` чрез `initSchema()` (Task 2).
- Produces: след `seed()` — 8 ментора (по 2 на стил D/I/S/C), всички служители с телефон и магазин от списъка, 3 чакащи заявки.

- [ ] **Step 1: Failing тест `server/test/seed.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './helpers.js';
import { seed } from '../src/seed.js';

test('seed: 8 ментора по 2 на стил, реални магазини, телефони, 3 чакащи заявки', () => {
  seed();
  const styles = db.prepare('SELECT mentor_style s, COUNT(*) n FROM users WHERE is_mentor = 1 GROUP BY mentor_style ORDER BY s').all();
  assert.deepEqual(styles.map((r) => [r.s, r.n]), [['C', 2], ['D', 2], ['I', 2], ['S', 2]]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'employee' AND phone IS NULL").get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE store IS NOT NULL AND store NOT IN (SELECT name FROM stores)').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE is_mentor = 1 AND store IS NULL').get().n, 0);
  const reqs = db.prepare("SELECT * FROM disc_requests WHERE status = 'pending'").all();
  assert.equal(reqs.length, 3);
  assert.ok(reqs.every((r) => r.suggested_mentor_id));
  // демо входът с имейл остава
  assert.ok(db.prepare("SELECT 1 FROM users WHERE email = 'ivan@triesta.bg' AND phone IS NOT NULL").get());
});
```

- [ ] **Step 2: Пусни — трябва да падне**

Run: `npm --prefix server test`
Expected: FAIL в `seed.test.js`.

- [ ] **Step 3: Промени `server/src/seed.js`**

3a. Импорт най-горе: `import { suggestMentor } from './mentorMatch.js';`

3b. Замени целия масив `const USERS = [ … ];` с (имейлите на съществуващите демо акаунти остават, за да работи старият вход):

```js
const USERS = [
  { name: 'Мария Георгиева', email: 'mariya@triesta.bg', phone: '0888100001', role: 'manager', store: 'ЦЕНТРАЛЕН ОФИС', position: 'Регионален управител', mentor: null, start_date: '2019-03-01', is_mentor: 1, mentor_style: 'D', feedback_rating: 4.8, retention_rate: 92 },
  // Ментори (старши служители, които обучават други) – по двама за всеки DISC стил
  { name: 'Анна Димитрова', email: 'anna@triesta.bg', phone: '0888100002', role: 'employee', store: 'ДУБРОВНИК', position: 'Старши продавач', mentor: 'Мария Георгиева', start_date: '2022-06-10', is_mentor: 1, mentor_style: 'I', feedback_rating: 4.7, retention_rate: 90 },
  { name: 'Петър Петров', email: 'petar@triesta.bg', phone: '0888100003', role: 'employee', store: 'САКАР', position: 'Старши продавач', mentor: 'Анна Димитрова', start_date: '2023-09-01', is_mentor: 1, mentor_style: 'S', feedback_rating: 4.9, retention_rate: 88 },
  { name: 'Даниел Вълчев', email: null, phone: '0888100004', role: 'employee', store: 'ШИПКА', position: 'Старши продавач', mentor: null, start_date: '2021-04-12', is_mentor: 1, mentor_style: 'D', feedback_rating: 4.5, retention_rate: 85 },
  { name: 'Ралица Христова', email: null, phone: '0888100005', role: 'employee', store: 'ИСКЪР', position: 'Старши продавач', mentor: null, start_date: '2022-01-17', is_mentor: 1, mentor_style: 'I', feedback_rating: 4.6, retention_rate: 87 },
  { name: 'Теодора Маринова', email: null, phone: '0888100006', role: 'employee', store: 'ТРАКИЯ', position: 'Старши продавач', mentor: null, start_date: '2020-09-03', is_mentor: 1, mentor_style: 'S', feedback_rating: 4.8, retention_rate: 93 },
  { name: 'Калин Янев', email: null, phone: '0888100007', role: 'employee', store: 'МЛАДОСТ', position: 'Старши продавач', mentor: null, start_date: '2021-11-22', is_mentor: 1, mentor_style: 'C', feedback_rating: 4.4, retention_rate: 84 },
  { name: 'Йоана Стоева', email: null, phone: '0888100008', role: 'employee', store: 'МИР', position: 'Старши продавач', mentor: null, start_date: '2022-03-08', is_mentor: 1, mentor_style: 'C', feedback_rating: 4.7, retention_rate: 89 },
  // Служители
  { name: 'Иван Петров', email: 'ivan@triesta.bg', phone: '0888200001', role: 'employee', store: 'ИСКЪР', position: 'Продавач-консултант', mentor: 'Мария Георгиева', start_date: '2024-04-15' },
  { name: 'Георги Георгиев', email: 'georgi@triesta.bg', phone: '0888200002', role: 'employee', store: 'ТРАКИЯ', position: 'Продавач-консултант', mentor: 'Петър Петров', start_date: '2025-06-20' },
  { name: 'Стефан Колев', email: 'stefan@triesta.bg', phone: '0888200003', role: 'employee', store: 'ТРАКИЯ', position: 'Продавач-консултант', mentor: 'Петър Петров', start_date: '2024-02-05' },
  { name: 'Николай Стоянов', email: 'nikolay@triesta.bg', phone: '0888200004', role: 'employee', store: 'САКАР', position: 'Продавач-консултант', mentor: 'Петър Петров', start_date: '2025-03-12' },
  { name: 'Елена Тодорова', email: 'elena@triesta.bg', phone: '0888200005', role: 'employee', store: 'ДУБРОВНИК', position: 'Продавач-консултант', mentor: 'Анна Димитрова', start_date: '2023-11-20' },
  { name: 'Виктория Илиева', email: 'viktoria@triesta.bg', phone: '0888200006', role: 'employee', store: 'ДУБРОВНИК', position: 'Продавач-консултант', mentor: 'Анна Димитрова', start_date: '2025-05-28' },
  { name: 'Мартин Костов', email: 'martin@triesta.bg', phone: '0888200007', role: 'employee', store: 'ИСКЪР', position: 'Продавач-консултант', mentor: 'Мария Георгиева', start_date: '2024-08-14' },
  { name: 'Десислава Ангелова', email: 'desislava@triesta.bg', phone: '0888200008', role: 'employee', store: 'ИСКЪР', position: 'Старши продавач', mentor: 'Мария Георгиева', start_date: '2021-10-01' },
];
```

Преди да замениш: сравни с текущия масив — ако има потребители, които не са в списъка по-горе (ред 234 е коментар/служители, редове 230–242), запази ги със същите полета плюс `phone` (`0888200009`, `0888200010`, …) и магазин от картата: `Магазин Изток`→`ДУБРОВНИК`, `Магазин Люлин`→`САКАР`, `Магазин Искър`→`ИСКЪР`, `Магазин Тракия`→`ТРАКИЯ`, `Централен офис`→`ЦЕНТРАЛЕН ОФИС`. Обектът `PROGRESS` е по имейл – ключовете му не се променят.

3c. В `seed()`:
- В реда с `DELETE FROM …` добави `DELETE FROM disc_requests;` и в `sqlite_sequence` списъка — `'disc_requests'`.
- Замени `insUser` и цикъла след него с:

```js
  const insUser = db.prepare('INSERT INTO users (name, email, phone, password_hash, role, store, position, mentor, start_date, is_mentor, mentor_style, feedback_rating, retention_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const userByEmail = {};
  for (const u of USERS) {
    const id = insUser.run(u.name, u.email ? u.email.toLowerCase() : null, u.phone, hash, u.role, u.store, u.position, u.mentor, u.start_date,
      u.is_mentor || 0, u.mentor_style ?? null, u.feedback_rating ?? null, u.retention_rate ?? null).lastInsertRowid;
    if (u.email) userByEmail[u.email] = id;
  }
```

- След блока с кандидатурите (`for (const a of APPLICATIONS) insApp.run(...a);`) добави:

```js
  // Примерни чакащи заявки от публичния DISC тест
  const insReq = db.prepare(`INSERT INTO disc_requests (name, phone, disc_result, disc_scores, suggested_mentor_id, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`);
  const REQUESTS = [
    ['Пешо Иванов', '0899300001', 'D', { D: 8, I: 2, S: 1, C: 1 }, '2026-09-28 10:15:00'],
    ['Мила Стоянова', '0899300002', 'I', { D: 1, I: 7, S: 3, C: 1 }, '2026-09-28 16:40:00'],
    ['Васил Николов', '0899300003', 'C', { D: 2, I: 1, S: 2, C: 7 }, '2026-09-29 09:05:00'],
  ];
  for (const [name, phone, style, scores, at] of REQUESTS)
    insReq.run(name, phone, style, JSON.stringify(scores), suggestMentor(style)?.id ?? null, at);
```

- В `console.log('▸ Демо парола за всички: ', PASSWORD);` няма промяна.

- [ ] **Step 4: Пусни — трябва да мине**

Run: `npm --prefix server test`
Expected: PASS за всички.

- [ ] **Step 5: Презареди примерните данни в истинската база**

Run: `npm run seed`
Expected: `▸ Заредени данни: { users: 16, … }` без грешка.

- [ ] **Step 6: Commit**

```bash
git add server/src/seed.js server/test/seed.test.js
git commit -m "Примерни данни: реални магазини, 8 ментора по стил, телефони, чакащи заявки

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Клиент — публичната страница `/disc-start` и входът с телефон

**Files:**
- Modify: `client/src/api.js`
- Create: `client/src/disc.jsx`
- Create: `client/src/pages/DiscStart.jsx`
- Modify: `client/src/App.jsx` (маршрут, параметър на `login`)
- Modify: `client/src/pages/Login.jsx`

**Interfaces:**
- Consumes: `GET/POST /api/public/disc`, `POST /api/public/disc/check` (Task 5); `POST /api/auth/login {login, password}` (Task 6).
- Produces в `client/src/api.js`: `login(login, password)`, `publicDisc()`, `publicDiscCheck(phone)`, `publicDiscSubmit({ name, phone, answers })`, `discRequests()`, `discRequestCount()`, `approveDiscRequest(id, mentorId)`, `rejectDiscRequest(id)`, `completeMentee(id)`, `adminStores()`, `adminCreateStore(data)`, `adminUpdateStore(id, data)`, `adminDeleteStore(id)`.
- Produces `client/src/disc.jsx`: `DISC = { D: { name, color }, I: …, S: …, C: … }`, `DISC_KEYS = ['D','I','S','C']`.

- [ ] **Step 1: `client/src/api.js`**

Замени реда на `login` с:

```js
  login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
```

След реда `apply: (data) => …` добави:

```js
  publicDisc: () => request('/public/disc'),
  publicDiscCheck: (phone) => request('/public/disc/check', { method: 'POST', body: JSON.stringify({ phone }) }),
  publicDiscSubmit: (data) => request('/public/disc', { method: 'POST', body: JSON.stringify(data) }),
```

След `deleteApplication: …` добави:

```js
  discRequests: () => request('/manager/disc-requests'),
  discRequestCount: () => request('/manager/disc-requests/count'),
  approveDiscRequest: (id, mentorId) => request('/manager/disc-requests/' + id + '/approve', { method: 'POST', body: JSON.stringify({ mentorId }) }),
  rejectDiscRequest: (id) => request('/manager/disc-requests/' + id + '/reject', { method: 'POST' }),
  completeMentee: (id) => request('/manager/mentees/' + id + '/complete', { method: 'POST' }),
```

След `adminDeleteUser: …` добави:

```js

  // ── админ: магазини ──
  adminStores: () => request('/admin/stores'),
  adminCreateStore: (data) => request('/admin/stores', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateStore: (id, data) => request('/admin/stores/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteStore: (id) => request('/admin/stores/' + id, { method: 'DELETE' }),
```

- [ ] **Step 2: `client/src/disc.jsx`**

```jsx
// Имена и цветове на DISC стиловете (същите като в server/src/disc.js).
export const DISC = {
  D: { name: 'Доминантен', color: '#E1352B' },
  I: { name: 'Влиятелен', color: '#F0A020' },
  S: { name: 'Постоянен', color: '#3F9A54' },
  C: { name: 'Последователен', color: '#2F73C4' },
};
export const DISC_KEYS = ['D', 'I', 'S', 'C'];

export function DiscBadge({ style }) {
  const s = DISC[style];
  if (!s) return <span className="pill n">—</span>;
  return <span className="pill" style={{ background: s.color, color: '#fff' }}>{style} · {s.name}</span>;
}
```

(Файлът е `.jsx`, защото `DiscBadge` съдържа JSX; импортира се като `'../disc.jsx'`.)

- [ ] **Step 3: `client/src/pages/DiscStart.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';

// Публична страница (общ QR код): кандидат, одобрен на интервю, прави DISC теста.
// Резултатът не се показва – отива при управителя заедно с предложен ментор.
export default function DiscStart() {
  const [step, setStep] = useState('form'); // form | test | done
  const [f, setF] = useState({ name: '', phone: '' });
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.publicDisc().then((d) => setQuestions(d.questions)).catch((e) => setErr(e.message)); }, []);

  async function start(e) {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Въведи име и фамилия.');
    setBusy(true);
    try { await api.publicDiscCheck(f.phone); setStep('test'); window.scrollTo({ top: 0 }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    setErr(''); setBusy(true);
    try { await api.publicDiscSubmit({ name: f.name, phone: f.phone, answers }); setStep('done'); window.scrollTo({ top: 0 }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const allAnswered = questions && questions.every((q) => answers[q.id] !== undefined);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--dark)', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span className="n300 ac" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, color: 'var(--orange-2)' }}>300</span>
        <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 1.5, lineHeight: 1 }}>ТРИСТА<br /><span style={{ fontSize: 8.5, color: '#b7ada6' }}>АКАДЕМИЯ 300</span></span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px 60px' }}>
        {step === 'done' && (
          <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 560, margin: '30px auto' }}>
            <div style={{ color: 'var(--green)', marginBottom: 12 }}><Icon name="checkc" size={54} /></div>
            <h1 style={{ fontSize: 26, textTransform: 'uppercase' }}>Благодарим!</h1>
            <p className="muted" style={{ marginTop: 8, fontSize: 15.5 }}>
              Управителят ще потвърди и ще получите данни за вход.
            </p>
          </div>
        )}

        {step === 'form' && (
          <form className="card" style={{ padding: 28 }} onSubmit={start}>
            <div className="eyebrow">Добре дошли в Триста</div>
            <h1 style={{ fontSize: 26, margin: '4px 0 8px' }}>Кратък тест за стил на работа</h1>
            <p className="muted" style={{ marginTop: 0 }}>12 въпроса, около 3 минути. Няма грешни отговори. По резултата ще ви определим ментор.</p>
            <div className="field"><label>Име и фамилия</label>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" required /></div>
            <div className="field"><label>Телефон</label>
              <input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0888 123 456" autoComplete="tel" required /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={busy || !questions}>{busy ? 'Проверка…' : 'Започни теста'}</button>
          </form>
        )}

        {step === 'test' && questions && (
          <>
            <div className="card" style={{ padding: '10px 22px 20px' }}>
              {questions.map((q, i) => (
                <div key={q.id} className="q">
                  <div className="qt">{i + 1}. {q.text}</div>
                  {q.options.map((opt, idx) => (
                    <label key={idx} className={'opt' + (answers[q.id] === idx ? ' sel' : '')}>
                      <input type="radio" name={'q' + q.id} style={{ display: 'none' }}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))} />
                      <span className="dot" />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {err && <div className="err" style={{ marginTop: 14 }}>{err}</div>}
            <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn" disabled={!allAnswered || busy} onClick={submit}>{busy ? 'Изпращане…' : 'Изпрати'}</button>
              {!allAnswered && <span className="muted" style={{ fontSize: 13.5 }}>Отговори на всички въпроси.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Маршрут в `client/src/App.jsx`**

Добави импорт `import DiscStart from './pages/DiscStart.jsx';` и след `<Route path="/apply" element={<Apply />} />`:

```jsx
        <Route path="/disc-start" element={<DiscStart />} />
```

В `value` на контекста смени `async login(email, password) { const d = await api.login(email, password); …` на `async login(login, password) { const d = await api.login(login, password); …`.

- [ ] **Step 5: `client/src/pages/Login.jsx`**

Промени в `Login()` (само състоянието и формата; лявата част „Академия 300“ не се пипа):

```jsx
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(user, password); nav('/'); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function fill(value) { setUser(value); setPassword('triesta123'); }
```

Във формата замени реда с подсказката, етикета и полето за имейл с:

```jsx
          <p className="muted" style={{ marginTop: 6 }}>Служителите влизат с телефона си, управителите – с имейл.</p>
          <label>Телефон или имейл</label>
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="0888 123 456 или ime@triesta.bg" autoComplete="username" required />
```

и демо подсказката с:

```jsx
          <div className="demo-hint">
            <b>Демо профили</b> (парола: <b>triesta123</b>)<br />
            Служител: <button type="button" onClick={() => fill('0888 200 001')}>0888 200 001</button><br />
            Управител: <button type="button" onClick={() => fill('mariya@triesta.bg')}>mariya@triesta.bg</button>
          </div>
```

- [ ] **Step 6: Сглоби клиента**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 7: Ръчна проверка в браузъра**

Пусни `START.bat` (или `npm run dev`), отвори http://localhost:5173/disc-start:
- име + телефон `0899 300 001` (вече има чакаща заявка от seed) → съобщение „Вече имате подадена заявка…“;
- име + нов телефон → 12 въпроса → „Изпрати“ → „Благодарим!“ без резултат и без ментор;
- http://localhost:5173/login → вход с `0888 200 001` / `triesta123` → влиза като Иван Петров; вход с `ivan@triesta.bg` също работи.

- [ ] **Step 8: Commit**

```bash
git add client/src/api.js client/src/disc.jsx client/src/pages/DiscStart.jsx client/src/App.jsx client/src/pages/Login.jsx
git commit -m "Публична страница за DISC тест (QR) и вход с телефон или имейл

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Клиент — раздел „Заявки“ с брояч в менюто

**Files:**
- Create: `client/src/pages/Requests.jsx`
- Modify: `client/src/App.jsx` (маршрут, меню с брояч)

**Interfaces:**
- Consumes: `api.discRequests()`, `api.discRequestCount()`, `api.approveDiscRequest(id, mentorId)`, `api.rejectDiscRequest(id)` (Task 10); `DISC`, `DiscBadge` от `client/src/disc.jsx`; `Modal`, `Loading`, `initials` от `components.jsx`.

- [ ] **Step 1: `client/src/pages/Requests.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal, initials } from '../components.jsx';
import { DiscBadge } from '../disc.jsx';

const fmt = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' }) : '');
const phoneFmt = (p) => (p && p.length === 10 ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p);

// Менторите със същия стил – първи, после по натовареност и име.
function mentorOptions(mentors, style) {
  return [...mentors].sort((a, b) =>
    (b.mentor_style === style) - (a.mentor_style === style) || a.active - b.active || a.name.localeCompare(b.name, 'bg'));
}

function RequestCard({ r, mentors, onDone }) {
  const [mentorId, setMentorId] = useState(r.suggested_mentor?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function approve() {
    setErr(''); setBusy(true);
    try { onDone(await api.approveDiscRequest(r.id, Number(mentorId))); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function reject() {
    if (!confirm(`Да откажа ли заявката на „${r.name}“?`)) return;
    setErr(''); setBusy(true);
    try { await api.rejectDiscRequest(r.id); onDone(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="emp" style={{ flex: '1 1 220px' }}>
          <div className="av">{initials(r.name)}</div>
          <div><b>{r.name}</b><div className="muted" style={{ fontSize: 13 }}>{phoneFmt(r.phone)} · {fmt(r.created_at)}</div></div>
        </div>
        <DiscBadge style={r.disc_result} />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Ментор {r.suggested_mentor ? '(предложен от системата)' : '— няма ментор с този стил, избери ръчно'}</label>
        <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
          <option value="">— избери ментор —</option>
          {mentorOptions(mentors, r.disc_result).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.mentor_style || '?'} · {m.store || 'без магазин'} · обучава {m.active}
            </option>
          ))}
        </select>
      </div>

      {err && <div className="err">{err}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" disabled={busy || !mentorId} onClick={approve}><Icon name="check" size={17} /> Одобри</button>
        <button className="btn ghost" disabled={busy} onClick={reject}>Откажи</button>
      </div>
    </div>
  );
}

export default function Requests() {
  const [data, setData] = useState(null);
  const [created, setCreated] = useState(null); // { name, phone, password }
  const [copied, setCopied] = useState(false);

  function load() { api.discRequests().then(setData); }
  useEffect(() => { load(); }, []);
  if (!data) return <Loading />;

  function done(result) {
    if (result) { setCreated(result); setCopied(false); }
    load();
    window.dispatchEvent(new Event('requests-changed'));
  }
  async function copy() {
    const text = `Вход в Академия 300: ${window.location.origin}/login\nТелефон: ${created.phone}\nПарола: ${created.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Нови служители</div>
        <h1>Заявки от DISC теста</h1>
        <p>Кандидатите, одобрени на интервю, правят теста през QR кода. Системата предлага ментор със същия стил – потвърди или избери друг.</p>
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>{data.pending.length} чакащи</div>
      {data.pending.length === 0
        ? <div className="card" style={{ padding: 24 }} ><span className="muted">Няма чакащи заявки.</span></div>
        : <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
            {data.pending.map((r) => <RequestCard key={r.id} r={r} mentors={data.mentors} onDone={done} />)}
          </div>}

      {data.history.length > 0 && (
        <details style={{ marginTop: 26 }}>
          <summary className="eyebrow" style={{ cursor: 'pointer' }}>История ({data.history.length})</summary>
          <div className="card" style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="table">
              <thead><tr><th>Име</th><th>Телефон</th><th>Стил</th><th>Решение</th><th>Дата</th></tr></thead>
              <tbody>
                {data.history.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td><b>{r.name}</b></td>
                    <td className="muted">{phoneFmt(r.phone)}</td>
                    <td><DiscBadge style={r.disc_result} /></td>
                    <td>{r.status === 'approved' ? <span className="pill g">Одобрена</span> : <span className="pill n">Отказана</span>}</td>
                    <td className="muted">{fmt(r.decided_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {created && (
        <Modal title="Акаунтът е създаден" onClose={() => setCreated(null)}>
          <p style={{ marginTop: 0 }}>Дай тези данни на <b>{created.name}</b>. Паролата се показва <b>само сега</b>.</p>
          <div style={{ background: 'var(--tint-2)', borderRadius: 12, padding: '14px 16px', fontSize: 16, lineHeight: 1.8 }}>
            Телефон: <b>{phoneFmt(created.phone)}</b><br />
            Парола: <b style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 2 }}>{created.password}</b>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={copy}>{copied ? 'Копирано ✓' : 'Копирай'}</button>
            <button className="btn" onClick={() => setCreated(null)}>Готово</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Маршрут и меню в `client/src/App.jsx`**

2a. Импорти: `import Requests from './pages/Requests.jsx';` и добави `useLocation` в импорта от `react-router-dom`.

2b. В защитените маршрути, след `<Route path="/candidates" … />`:

```jsx
          <Route path="/requests" element={<Requests />} />
```

2c. В `Layout()` след `const [menuOpen, setMenuOpen] = useState(false);` добави брояча (обновява се при смяна на страница и след одобрение/отказ):

```jsx
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!isManager) return;
    const refresh = () => api.discRequestCount().then((d) => setPendingCount(d.pending)).catch(() => {});
    refresh();
    window.addEventListener('requests-changed', refresh);
    return () => window.removeEventListener('requests-changed', refresh);
  }, [isManager, location.pathname]);
```

2d. В менюто на управителя, след линка „Кандидати“:

```jsx
              <NavLink to="/requests" className={({ isActive }) => isActive ? 'active' : ''}>
                Заявки{pendingCount > 0 && <span className="pill a" style={{ marginLeft: 6, padding: '1px 7px' }}>{pendingCount}</span>}
              </NavLink>
```

- [ ] **Step 3: Сглоби клиента**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 4: Ръчна проверка в браузъра**

Вход `mariya@triesta.bg` / `triesta123`:
- в менюто „Заявки“ с брояч (3 от seed + тази от Task 10);
- заявката на Пешо Иванов показва D и предложен доминантен ментор; падащото меню е с D-менторите най-горе;
- „Одобри“ → прозорче с телефон и парола; „Копирай“ → „Копирано ✓“; броячът намалява;
- отвори частен прозорец → вход с телефона и паролата → влиза като служител;
- „Откажи“ на друга заявка → изчезва от чакащите, появява се в „История“.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Requests.jsx client/src/App.jsx
git commit -m "Раздел „Заявки“: одобрение с избор на ментор, временна парола, брояч в менюто

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Клиент — „Ментори“: кой кого обучава, „Завършил“, QR код

**Files:**
- Modify: `client/src/pages/Mentors.jsx`

**Interfaces:**
- Consumes: новите полета от `GET /api/manager/mentors` (Task 7): `mentor_style`, `active`, `activeList`, `doneList`, `stats.totalActive`; `api.completeMentee(id)` (Task 10); `DiscBadge` от `client/src/disc.jsx`; `qrcode` (вече е в `client/package.json`).

- [ ] **Step 1: Импорти и зареждане**

Най-горе добави:

```jsx
import QRCode from 'qrcode';
import { DiscBadge } from '../disc.jsx';
```

Замени началото на `Mentors()` (двата реда `const [data, setData] …` и `useEffect(…)`) с:

```jsx
  const [data, setData] = useState(null);
  const [qr, setQr] = useState('');
  const discUrl = window.location.origin + '/disc-start';
  function load() { api.managerMentors().then(setData); }
  useEffect(() => {
    load();
    QRCode.toDataURL(discUrl, { margin: 1, width: 600, color: { dark: '#1D1D1B', light: '#FFFFFF' } }).then(setQr).catch(() => {});
  }, []);

  async function complete(p) {
    if (!confirm(`„${p.name}“ завърши ли обучението при ментора си?`)) return;
    try { await api.completeMentee(p.id); load(); }
    catch (e) { alert(e.message); }
  }
```

- [ ] **Step 2: Нов блок „Кой кого обучава сега“ + QR**

Непосредствено **преди** коментара `{/* Рейтинг на менторите */}` вмъкни:

```jsx
      {/* QR код за новите служители */}
      <div className="card" style={{ padding: 20, marginBottom: 22, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {qr && <img src={qr} alt="QR код за DISC теста" width={130} height={130} style={{ borderRadius: 12, border: '1px solid var(--line)' }} />}
        <div style={{ flex: '1 1 260px' }}>
          <b style={{ fontSize: 17 }}>QR код за нови служители</b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>Кандидат, одобрен на интервю, сканира кода и прави DISC теста. Заявката идва в „Заявки“.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {qr && <a className="btn sm" href={qr} download="QR-DISC-test-Akademiya-300.png">Изтегли за печат</a>}
            <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>{discUrl}</span>
          </div>
        </div>
      </div>

      {/* Кой кого обучава в момента */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>Кой кого обучава сега · {stats.totalActive} в обучение</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginBottom: 22 }}>
        {[...mentors].sort((a, b) => (a.mentor_style || 'Z').localeCompare(b.mentor_style || 'Z') || a.name.localeCompare(b.name, 'bg')).map((m) => (
          <div key={m.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 16 }}>{m.name}</b>
              <DiscBadge style={m.mentor_style} />
            </div>
            <div className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>{m.store || 'без магазин'} · обучава <b>{m.active}</b></div>
            {m.activeList.length === 0
              ? <div className="muted" style={{ fontSize: 13.5 }}>В момента не обучава никого.</div>
              : m.activeList.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                    <span style={{ flex: 1 }}>{p.name}<span className="muted" style={{ fontSize: 12.5 }}>{p.start_date ? ` · от ${p.start_date}` : ''}</span></span>
                    <button className="btn ghost sm" onClick={() => complete(p)}>Завършил</button>
                  </div>
                ))}
            {m.doneList.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary className="muted" style={{ cursor: 'pointer', fontSize: 13 }}>Завършили ({m.doneList.length})</summary>
                {m.doneList.map((p) => <div key={p.id} className="muted" style={{ fontSize: 13, padding: '3px 0' }}>{p.name} · {p.mentorship_done_at.slice(0, 10)}</div>)}
              </details>
            )}
          </div>
        ))}
      </div>
```

- [ ] **Step 3: Сглоби клиента**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 4: Ръчна проверка в браузъра**

Като управител → „Ментори“:
- QR кодът се вижда; „Изтегли за печат“ сваля PNG; сканиран с телефон (в същата мрежа, през адреса на компютъра) отваря `/disc-start`;
- 8 карти, подредени C/D/I/S, всяка със стил, магазин и брой; одобреният в Task 11 служител е при избрания ментор;
- „Завършил“ → потвърждение → човекът минава в „Завършили“, броят намалява;
- таблицата „Рейтинг на менторите“ и бонусите изглеждат както преди.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Mentors.jsx
git commit -m "Ментори: кой кого обучава сега, бутон „Завършил“, QR код за DISC теста

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Клиент — „Служители“: телефон, стил, магазин от списъка, секция „Магазини“

**Files:**
- Modify: `client/src/pages/AdminUsers.jsx`

**Interfaces:**
- Consumes: `api.adminStores()`, `api.adminCreateStore(data)`, `api.adminUpdateStore(id, data)`, `api.adminDeleteStore(id)` (Task 10); `phone`, `mentor_style` в `GET /api/admin/users` (Task 8); `DISC`, `DISC_KEYS` от `client/src/disc.jsx`.

- [ ] **Step 1: Данни и зареждане**

1a. Импорт: `import { DISC, DISC_KEYS } from '../disc.jsx';`

1b. `BLANK` — добави `phone: '', mentor_style: '',`:

```jsx
const BLANK = { name: '', email: '', phone: '', password: '', role: 'employee', store: '', position: '', mentor: '', start_date: '', is_mentor: 0, mentor_style: '', feedback_rating: '', retention_rate: '' };
```

1c. След `const [users, setUsers] = useState(null);` добави `const [stores, setStores] = useState([]);`, а `load()` стане:

```jsx
  function load() {
    api.adminUsers().then((d) => setUsers(d.users));
    api.adminStores().then((d) => setStores(d.stores));
  }
```

1d. В `setEditing({ ...u, password: '', … })` (бутона за редакция) добави `phone: u.phone || '', email: u.email || '', mentor_style: u.mentor_style || '',`.

- [ ] **Step 2: Таблица**

Заглавието `<th>Имейл</th>` → `<th>Телефон / имейл</th>`, а клетката `<td className="muted">{u.email}</td>` →

```jsx
                <td className="muted">{u.phone ? `${u.phone.slice(0, 4)} ${u.phone.slice(4, 7)} ${u.phone.slice(7)}` : ''}{u.phone && u.email ? <br /> : null}{u.email}</td>
```

До значката „Ментор“ добави стила: в `{u.is_mentor ? <span className="pill a" …> Ментор</span> : null}` смени текста `Ментор` на `Ментор{u.mentor_style ? ' · ' + u.mentor_style : ''}`.

Текстът под заглавието на страницата: „Служителите влизат с имейла и паролата, които зададеш тук.“ → „Служителите влизат с телефона си, управителите – с имейл.“

- [ ] **Step 3: Форма**

3a. Полето за имейл става:

```jsx
            <div className="field"><label>Телефон {editing.role === 'employee' ? '(за вход)' : '(по избор)'}</label>
              <input type="tel" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="0888 123 456" /></div>
            <div className="field"><label>Имейл {editing.role === 'manager' ? '(за вход)' : '(по избор)'}</label>
              <input value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="ime@triesta.bg" /></div>
```

3b. Полето „Магазин“ става падащо меню:

```jsx
            <div className="field"><label>Магазин</label>
              <select value={editing.store || ''} onChange={(e) => setEditing({ ...editing, store: e.target.value })}>
                <option value="">— без магазин —</option>
                {stores.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select></div>
```

3c. В блока `{!!editing.is_mentor && ( … )}` добави първо поле за стила (над рейтинга):

```jsx
                <div className="field" style={{ margin: 0, gridColumn: '1 / -1' }}><label>DISC стил на ментора</label>
                  <select value={editing.mentor_style || ''} onChange={(e) => setEditing({ ...editing, mentor_style: e.target.value })}>
                    <option value="">— избери —</option>
                    {DISC_KEYS.map((k) => <option key={k} value={k}>{k} · {DISC[k].name}</option>)}
                  </select></div>
```

- [ ] **Step 4: Секция „Магазини“**

Добави компонента над `export default function AdminUsers()`:

```jsx
function StoresSection({ stores, reload }) {
  const [name, setName] = useState('');
  const [loc, setLoc] = useState('');
  const [err, setErr] = useState('');

  async function run(fn) {
    setErr('');
    try { await fn(); reload(); } catch (e) { setErr(e.message); }
  }
  const add = (e) => { e.preventDefault(); run(async () => { await api.adminCreateStore({ name, location_id: loc }); setName(''); setLoc(''); }); };
  const rename = (s) => {
    const n = prompt('Ново име на магазина:', s.name);
    if (n && n.trim() !== s.name) run(() => api.adminUpdateStore(s.id, { name: n, location_id: s.location_id }));
  };
  const remove = (s) => { if (confirm(`Да изтрия ли магазин „${s.name}“?`)) run(() => api.adminDeleteStore(s.id)); };

  return (
    <>
      <div className="section-head" style={{ marginTop: 30 }}>
        <div className="eyebrow">Магазини · {stores.length}</div>
      </div>
      <form className="card" style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }} onSubmit={add}>
        <div className="field" style={{ margin: 0, flex: '2 1 200px' }}><label>Нов магазин</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. ВИТОША" /></div>
        <div className="field" style={{ margin: 0, flex: '1 1 120px' }}><label>№ в Мистрал</label>
          <input type="number" value={loc} onChange={(e) => setLoc(e.target.value)} /></div>
        <button className="btn sm" disabled={!name.trim()}><Icon name="plus" size={16} /> Добави</button>
      </form>
      {err && <div className="err">{err}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>№</th><th>Магазин</th><th>Хора</th><th></th></tr></thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id} style={{ cursor: 'default' }}>
                <td className="muted tabnum">{s.location_id ?? '—'}</td>
                <td><b>{s.name}</b></td>
                <td className="tabnum">{s.people}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" title="Преименувай" onClick={() => rename(s)}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn danger" title="Изтрий" disabled={s.people > 0} onClick={() => remove(s)}><Icon name="trash" size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

и го сложи в JSX на `AdminUsers` веднага след затварящия `</div>` на картата с таблицата на служителите (преди `{editing && (`):

```jsx
      <StoresSection stores={stores} reload={load} />
```

- [ ] **Step 5: Сглоби клиента**

Run: `npm --prefix client run build`
Expected: `✓ built in …` без грешки.

- [ ] **Step 6: Ръчна проверка в браузъра**

Като управител → „Служители“:
- колоната показва телефон и/или имейл; менторите имат „Ментор · D“ и т.н.;
- „Нов акаунт“ → служител само с име + телефон + парола + магазин от списъка → записва се; същият телефон втори път → грешка за телефона;
- отметка „ментор“ без стил → грешка „Избери DISC стил на ментора.“;
- секция „Магазини“: добави „ТЕСТ“, преименувай на „ТЕСТ 2“, изтрий; магазин с хора има неактивен бутон за изтриване;
- преименувай „МИР“ → „МИР 1“ и провери, че Йоана Стоева е в „МИР 1“ (после го върни).

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/AdminUsers.jsx
git commit -m "Служители: телефон, DISC стил на ментора, магазин от списъка, секция „Магазини“

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Цялостна проверка и паметта на проекта

**Files:**
- Modify: `КАЧВАНЕ-Render.md` само ако споменава вход с имейл за служителите (провери с търсене).

- [ ] **Step 1: Всички автоматични тестове**

Run: `npm --prefix server test`
Expected: `# fail 0`.

- [ ] **Step 2: Сглобяване за продукция**

Run: `npm --prefix client run build`
Expected: без грешки.

- [ ] **Step 3: Целият път в браузъра (свежи данни)**

Run: `npm run seed`, после `START.bat`.
1. Управител → „Ментори“ → изтегли QR; отвори `/disc-start` в частен прозорец.
2. Кандидат „Тест Доминантен“, `0899 555 000`, избира винаги първия отговор → „Благодарим!“ (без резултат).
3. Управител → „Заявки“ (броячът е 4) → заявката е D с предложен D-ментор с най-малко обучаеми → „Одобри“ → запиши паролата.
4. Частен прозорец → вход `+359899555000` + паролата → вижда „Моите обучения“; в „DISC тест“ резултатът е D.
5. Управител → „Ментори“ → новият човек е при ментора; „Завършил“ → минава в „Завършили“.

- [ ] **Step 4: Документ за качване**

Run: `git grep -n "имейл" -- "КАЧВАНЕ-Render.md" README* 2>/dev/null`
Ако има указания „служителите влизат с имейл“ — смени на „служителите влизат с телефон (управителите – с имейл)“ и добави ред за QR кода в „Ментори“. Ако няма – нищо.

- [ ] **Step 5: Commit (само ако има промени)**

```bash
git add -A
git commit -m "Документация: вход с телефон и QR код за DISC теста

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
