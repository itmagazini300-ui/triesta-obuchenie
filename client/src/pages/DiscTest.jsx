import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';
import { Loading } from '../components.jsx';

// разположение като в инфографиката: D I / C S
const QUADRANTS = ['D', 'I', 'C', 'S'];

function Wheel({ styles, primary, scores }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 420, margin: '0 auto' }}>
      {QUADRANTS.map((k) => {
        const s = styles[k];
        const active = k === primary;
        return (
          <div key={k} style={{
            background: s.color, color: '#fff', borderRadius: 12, padding: '16px 16px',
            opacity: active ? 1 : 0.62, position: 'relative',
            outline: active ? '3px solid var(--ink)' : 'none', outlineOffset: 2,
          }}>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>{s.name}</div>
            {scores && <div style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{scores[k]} т.</div>}
            {active && <div style={{ position: 'absolute', top: 10, right: 10 }}><Icon name="check" size={18} /></div>}
          </div>
        );
      })}
    </div>
  );
}

function Result({ data, onRetake }) {
  const s = data.styles[data.primary];
  return (
    <>
      <div className="card" style={{ padding: '26px 28px', marginBottom: 20, borderTop: `5px solid ${s.color}` }}>
        <div className="eyebrow" style={{ color: s.color }}>Твоят основен стил</div>
        <h1 style={{ fontSize: 30, textTransform: 'uppercase', marginTop: 4 }}>{data.primary} — {s.name}</h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', margin: '8px 0 18px', maxWidth: '60ch' }}>{s.tagline}</p>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Характерно за теб:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.traits.map((t) => (
                <div key={t} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <span style={{ color: s.color }}><Icon name="check" size={16} /></span>{t}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, background: 'var(--tint-2)', borderRadius: 11, padding: '12px 14px' }}>
              <b>Най-мотивиран от:</b> {s.motivation}
            </div>
          </div>
          <div style={{ flex: '1 1 300px' }}>
            <Wheel styles={data.styles} primary={data.primary} scores={data.scores} />
          </div>
        </div>
      </div>
      <button className="btn ghost" onClick={onRetake}>Попълни въпросника отново</button>
    </>
  );
}

export default function DiscTest() {
  const { patchUser } = useAuth();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('loading'); // loading | intro | test | result

  useEffect(() => {
    api.disc().then((d) => {
      setData(d);
      setMode(d.result ? 'result' : 'intro');
      if (d.result) setResult({ primary: d.result, styles: d.styles, scores: null });
    });
  }, []);

  if (!data) return <Loading />;

  const allAnswered = data.questions.every((q) => answers[q.id]);

  async function submit() {
    setBusy(true);
    try {
      const r = await api.submitDisc(answers);
      setResult(r);
      patchUser({ disc_result: r.primary });
      setMode('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  }
  function retake() { setAnswers({}); setResult(null); setMode('test'); }

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="eyebrow">Опознай себе си</div>
        <h1>Личностен въпросник</h1>
        <p>Въпросникът показва предпочитанията ни в поведение и комуникация. Помага ни да работим по-добре заедно — няма грешни отговори.</p>
      </div>

      {mode === 'result' && <Result data={result} onRetake={retake} />}

      {mode === 'intro' && (
        <div className="card" style={{ padding: 30 }}>
          <Wheel styles={data.styles} primary={null} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '22px 0' }}>
            {Object.values(data.styles).map((s) => (
              <div key={s.key} style={{ flex: '1 1 220px', display: 'flex', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: s.color, color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{s.key}</div>
                <div><b>{s.name}</b><div className="muted" style={{ fontSize: 13 }}>{s.tagline}</div></div>
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => setMode('test')}>Започни въпросника · {data.questions.length} въпроса</button>
        </div>
      )}

      {mode === 'test' && (
        <>
          <div className="card" style={{ padding: '10px 26px 20px' }}>
            {data.questions.map((q, i) => (
              <div key={q.id} className="q">
                <div className="qt">{i + 1}. {q.text}</div>
                {q.options.map((opt, idx) => (
                  <label key={idx} className={'opt' + (answers[q.id] === opt.style ? ' sel' : '')}>
                    <input type="radio" name={'q' + q.id} style={{ display: 'none' }}
                      checked={answers[q.id] === opt.style}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.style }))} />
                    <span className="dot" />
                    <span>{opt.text}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" disabled={!allAnswered || busy} onClick={submit}>{busy ? 'Изчислявам…' : 'Виж резултата'}</button>
            {!allAnswered && <span className="muted" style={{ fontSize: 13.5 }}>Отговори на всички въпроси.</span>}
          </div>
        </>
      )}
    </div>
  );
}
