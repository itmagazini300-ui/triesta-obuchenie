import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';

// Публична страница (общ QR код): кандидат, одобрен на интервю, прави DISC теста.
// Резултатът не се показва – отива при управителя заедно с предложен ментор.
export default function DiscStart() {
  const [step, setStep] = useState('form'); // form | test | done
  const [f, setF] = useState({ name: '', phone: '' });
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.publicDisc().then((d) => setQuestions(d.questions)).catch((e) => setErr(e.message)); }, []);

  async function start(e) {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Въведи име и фамилия.');
    setBusy(true);
    try { await api.publicDiscCheck(f.phone); setStep('test'); window.scrollTo({ top: 0 }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    setErr(''); setBusy(true);
    try { await api.publicDiscSubmit({ name: f.name, phone: f.phone, answers }); setStep('done'); window.scrollTo({ top: 0 }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const allAnswered = questions && questions.every((q) => answers[q.id] !== undefined);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--dark)', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span className="n300 ac" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, color: 'var(--orange-2)' }}>300</span>
        <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 1.5, lineHeight: 1 }}>ТРИСТА<br /><span style={{ fontSize: 8.5, color: '#b7ada6' }}>АКАДЕМИЯ 300</span></span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px 60px' }}>
        {step === 'done' && (
          <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 560, margin: '30px auto' }}>
            <div style={{ color: 'var(--green)', marginBottom: 12 }}><Icon name="checkc" size={54} /></div>
            <h1 style={{ fontSize: 26, textTransform: 'uppercase' }}>Благодарим!</h1>
            <p className="muted" style={{ marginTop: 8, fontSize: 15.5 }}>
              Управителят ще потвърди и ще получите данни за вход.
            </p>
          </div>
        )}

        {step === 'form' && (
          <form className="card" style={{ padding: 28 }} onSubmit={start}>
            <div className="eyebrow">Добре дошли в Триста</div>
            <h1 style={{ fontSize: 26, margin: '4px 0 8px' }}>Кратък тест за стил на работа</h1>
            <p className="muted" style={{ marginTop: 0 }}>12 въпроса, около 3 минути. Няма грешни отговори. По резултата ще ви определим ментор.</p>
            <div className="field"><label>Име и фамилия</label>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" required /></div>
            <div className="field"><label>Телефон</label>
              <input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0888 123 456" autoComplete="tel" required /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={busy || !questions}>{busy ? 'Проверка…' : 'Започни теста'}</button>
          </form>
        )}

        {step === 'test' && questions && (
          <>
            <div className="card" style={{ padding: '10px 22px 20px' }}>
              {questions.map((q, i) => (
                <div key={q.id} className="q">
                  <div className="qt">{i + 1}. {q.text}</div>
                  {q.options.map((opt, idx) => (
                    <label key={idx} className={'opt' + (answers[q.id] === idx ? ' sel' : '')}>
                      <input type="radio" name={'q' + q.id} style={{ display: 'none' }}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))} />
                      <span className="dot" />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {err && <div className="err" style={{ marginTop: 14 }}>{err}</div>}
            <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn" disabled={!allAnswered || busy} onClick={submit}>{busy ? 'Изпращане…' : 'Изпрати'}</button>
              {!allAnswered && <span className="muted" style={{ fontSize: 13.5 }}>Отговори на всички въпроси.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
