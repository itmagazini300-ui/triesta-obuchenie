import './env.js';
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
    INSERT INTO users (id, name, email, password_hash, role, store) VALUES (7, 'Стар Служител', 'star@trista.bg', 'h', 'employee', 'Магазин Люлин');
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
  assert.equal(u.email, 'star@trista.bg');
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
