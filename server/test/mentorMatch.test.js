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
