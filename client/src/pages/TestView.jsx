import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading } from '../components.jsx';

export default function TestView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [m, setM] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.module(id).then(setM); setAnswers({}); setResult(null); }, [id]);
  if (!m) return <Loading />;

  if (m.locked) {
    return (
      <div className="wrap" style={{ maxWidth: 640 }}>
        <Link to={'/category/' + m.category.id} className="back"><Icon name="arrowl" size={16} /> {m.category.title}</Link>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--muted)', marginBottom: 12 }}><Icon name="lock" size={44} /></div>
          <h1 style={{ fontSize: 22, textTransform: 'uppercase' }}>Тестът е заключен</h1>
          <p className="muted" style={{ marginTop: 8 }}>Завърши предишния модул, за да продължиш.</p>
          <Link to={'/category/' + m.category.id} className="btn" style={{ marginTop: 16 }}>Към категорията</Link>
        </div>
      </div>
    );
  }

  const allAnswered = m.questions.every((q) => answers[q.id] !== undefined);

  async function submit() {
    setBusy(true);
    try {
      const r = await api.submitTest(id, answers);
      setResult(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  }

  const reviewById = result ? Object.fromEntries(result.review.map((r) => [r.questionId, r])) : {};

  function optClass(q, idx) {
    if (!result) return answers[q.id] === idx ? 'opt sel' : 'opt';
    const rv = reviewById[q.id];
    if (idx === rv.correctIndex) return 'opt correct';
    if (answers[q.id] === idx && !rv.correct) return 'opt wrong';
    return 'opt';
  }

  return (
    <div className="wrap" style={{ maxWidth: 780 }}>
      <Link to={'/module/' + m.id} className="back"><Icon name="arrowl" size={16} /> Обратно към урока</Link>

      {result && (
        <div className={'result-banner ' + (result.passed ? 'pass' : 'fail')}>
          <div className="rp" style={{ color: result.passed ? 'var(--green)' : '#C0392B' }}>{result.score}%</div>
          <h2>{result.passed ? 'Успешно премина!' : 'Още малко!'}</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {result.correct} от {result.total} верни отговора · нужни са {result.passScore}%
          </p>
          {result.passed
            ? <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--green)' }}>Модулът е отбелязан като завършен.</div>
            : <div style={{ marginTop: 4, fontWeight: 700, color: '#C0392B' }}>Прегледай верните отговори и опитай пак.</div>}
        </div>
      )}

      <div className="card" style={{ padding: '10px 26px 20px' }}>
        <div style={{ padding: '16px 0 4px' }}>
          <span className="eyebrow">Тест</span>
          <h1 style={{ fontSize: 22, textTransform: 'uppercase', marginTop: 4 }}>{m.title}</h1>
        </div>
        {m.questions.map((q, i) => (
          <div key={q.id} className="q">
            <div className="qt">{i + 1}. {q.text}</div>
            {q.options.map((opt, idx) => (
              <label key={idx} className={optClass(q, idx)}>
                <input type="radio" name={'q' + q.id} style={{ display: 'none' }}
                  disabled={!!result}
                  checked={answers[q.id] === idx}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))} />
                <span className="dot" />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {!result && (
          <button className="btn" disabled={!allAnswered || busy} onClick={submit}>
            {busy ? 'Проверка…' : 'Предай теста'}
          </button>
        )}
        {!result && !allAnswered && <span className="muted" style={{ alignSelf: 'center', fontSize: 13.5 }}>Отговори на всички въпроси, за да предадеш.</span>}

        {result && (
          <>
            {result.passed && m.nextModuleId && (
              <button className="btn" onClick={() => nav('/module/' + m.nextModuleId)}>
                Следващ модул <Icon name="arrowr" size={18} />
              </button>
            )}
            {result.passed && !m.nextModuleId && (
              <button className="btn" onClick={() => nav('/category/' + m.category.id)}>
                <Icon name="check" size={18} /> Готово с категорията
              </button>
            )}
            {!result.passed && (
              <button className="btn" onClick={() => { setResult(null); setAnswers({}); window.scrollTo({ top: 0 }); }}>
                Опитай отново
              </button>
            )}
            <button className="btn ghost" onClick={() => nav('/module/' + m.id)}>Към урока</button>
          </>
        )}
      </div>
    </div>
  );
}
