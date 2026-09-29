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
  assert.equal(normalizePhone('+359 (0)888 123 456'), '0888123456');
  assert.equal(normalizePhone('00359 0888 123 456'), '0888123456');
});

test('връща null за празен или невалиден номер', () => {
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone(undefined), null);
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('08881234567'), null); // 11 цифри
  assert.equal(normalizePhone('888123456'), null);   // без водеща 0
});
