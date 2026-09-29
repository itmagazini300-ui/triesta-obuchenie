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
