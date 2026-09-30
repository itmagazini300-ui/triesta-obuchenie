import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import { ensureStores } from './stores.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

// Базата беше с грешно име „triesta.db“ – еднократно я преименуваме, без да губим данни.
const defaultFile = join(dataDir, 'trista.db');
const oldFile = join(dataDir, 'triesta.db');
if (!process.env.DB_PATH && !process.env.NODE_TEST_CONTEXT && !existsSync(defaultFile) && existsSync(oldFile)) {
  for (const ext of ['', '-wal', '-shm']) if (existsSync(oldFile + ext)) renameSync(oldFile + ext, defaultFile + ext);
}

// При `node --test` (NODE_TEST_CONTEXT) всеки тестов файл получава празна база в паметта.
const dbFile = process.env.DB_PATH || (process.env.NODE_TEST_CONTEXT ? ':memory:' : defaultFile);
export const db = new DatabaseSync(dbFile);

// По-добра надеждност при едновременен достъп
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

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

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (${USERS_COLUMNS}
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      icon        TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS modules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      summary     TEXT,
      content     TEXT,
      video_url   TEXT,
      duration    INTEGER,                               -- времетраене на видеото/урока в минути
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id     INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      text          TEXT NOT NULL,
      options       TEXT NOT NULL,           -- JSON масив от възможности
      correct_index INTEGER NOT NULL,
      order_index   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT,
      video_url   TEXT,
      duration    INTEGER,
      category    TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS applications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      phone      TEXT,
      email      TEXT,
      position   TEXT,
      city       TEXT,
      message    TEXT,
      status     TEXT NOT NULL DEFAULT 'new',   -- new|contacted|interview|hired|rejected
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id    INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'not_started', -- 'not_started'|'in_progress'|'completed'
      score        INTEGER,                             -- най-добър резултат от теста в %
      completed_at TEXT,
      updated_at   TEXT DEFAULT (datetime('now')),
      UNIQUE (user_id, module_id)
    );

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
  `);
  migrate();
}

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
    db.exec(`CREATE TABLE users_new (${USERS_COLUMNS}
)`);
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
