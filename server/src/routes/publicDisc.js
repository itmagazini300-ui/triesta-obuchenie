import { Router } from 'express';
import { db } from '../db.js';
import { DISC_QUESTIONS, scoreDisc } from '../disc.js';
import { normalizePhone } from '../phone.js';
import { suggestMentor } from '../mentorMatch.js';

// Публичен DISC тест за одобрени на интервю кандидати (общ QR код). Без вход.
// Кандидатът не вижда резултата – той отива само при управителя.
const router = Router();

const DUPLICATE = 'Вече имате подадена заявка. Управителят ще се свърже с вас.';

function phoneTaken(phone) {
  return !!(db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone)
    || db.prepare("SELECT 1 FROM disc_requests WHERE phone = ? AND status = 'pending'").get(phone));
}

router.get('/', (_req, res) => {
  res.json({
    questions: DISC_QUESTIONS.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => ({ text: o.text })) })),
  });
});

router.post('/check', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Въведи валиден телефон (напр. 0888 123 456).' });
  if (phoneTaken(phone)) return res.status(409).json({ error: DUPLICATE });
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: 'Въведи име и фамилия.' });
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Въведи валиден телефон (напр. 0888 123 456).' });

  // индекс на отговора → стил (клиентът не знае стиловете)
  const raw = req.body?.answers || {};
  const answers = {};
  for (const q of DISC_QUESTIONS) {
    const opt = q.options[Number(raw[q.id])];
    if (raw[q.id] === undefined || raw[q.id] === null || !opt) return res.status(400).json({ error: 'Отговори на всички въпроси.' });
    answers[q.id] = opt.style;
  }

  if (phoneTaken(phone)) return res.status(409).json({ error: DUPLICATE });

  const { scores, primary } = scoreDisc(answers);
  const mentor = suggestMentor(primary);
  db.prepare(`INSERT INTO disc_requests (name, phone, disc_result, disc_scores, suggested_mentor_id)
              VALUES (?, ?, ?, ?, ?)`).run(name, phone, primary, JSON.stringify(scores), mentor?.id ?? null);
  res.json({ ok: true });
});

export default router;
