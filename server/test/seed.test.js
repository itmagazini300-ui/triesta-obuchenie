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
  assert.ok(db.prepare("SELECT 1 FROM users WHERE email = 'ivan@trista.bg' AND phone IS NOT NULL").get());
});
