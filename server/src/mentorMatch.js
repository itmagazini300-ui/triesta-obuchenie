import { db } from './db.js';
import { companyOfStore } from './companyOf.js';

// Активен обучаем = служител с този ментор, който още не е маркиран "Завършил".
export function activeMenteeCount(mentorName) {
  return db.prepare(`SELECT COUNT(*) n FROM users
    WHERE role = 'employee' AND mentor = ? AND mentorship_done_at IS NULL`).get(mentorName).n;
}

export function listMentors() {
  return db.prepare('SELECT id, name, store, mentor_style FROM users WHERE is_mentor = 1 ORDER BY name').all()
    .map((m) => ({ ...m, company: companyOfStore(m.store), active: activeMenteeCount(m.name) }));
}

// Ментор със същия DISC стил и най-малко активни обучаеми; при равенство – по име.
export function suggestMentor(style) {
  const same = listMentors().filter((m) => m.mentor_style === style);
  if (!same.length) return null;
  same.sort((a, b) => a.active - b.active || a.name.localeCompare(b.name, 'bg'));
  return same[0];
}
