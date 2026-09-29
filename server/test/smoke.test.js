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
