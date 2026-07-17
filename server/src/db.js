import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'triesta.db'));

// По-добра надеждност при едновременен достъп
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'employee',   -- 'employee' | 'manager'
      store         TEXT,
      position      TEXT,
      mentor        TEXT,
      start_date    TEXT,
      is_mentor     INTEGER NOT NULL DEFAULT 0,
      feedback_rating REAL,                              -- оценка от обучените (1–5)
      retention_rate  INTEGER,                           -- задържане на обучените след 3 месеца (%)
      disc_result   TEXT,                                -- резултат от DISC теста: D | I | S | C
      disc_taken_at TEXT,
      seen_welcome  INTEGER NOT NULL DEFAULT 0,          -- видял ли е приветствения екран
      created_at    TEXT DEFAULT (datetime('now'))
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
  addCol('modules', 'duration', 'duration INTEGER');
}
