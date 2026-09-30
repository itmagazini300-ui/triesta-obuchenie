import { db } from './db.js';

// Името на фирмата на обект (по име на обекта) или null – ако обектът е без фирма или не съществува.
export function companyOfStore(store) {
  if (!store) return null;
  return db.prepare('SELECT c.name FROM stores s JOIN companies c ON c.id = s.company_id WHERE s.name = ?').get(store)?.name ?? null;
}
