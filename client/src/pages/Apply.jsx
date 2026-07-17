import { useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';

const PERKS = [
  { icon: 'grad', t: 'Обучение от първия ден', d: 'Ясна система с видеа, модули и ментор.' },
  { icon: 'trend', t: 'Реален път за развитие', d: 'От продавач до ментор и управител.' },
  { icon: 'users', t: 'Силен екип', d: 'Подкрепа и добри отношения всеки ден.' },
  { icon: 'store', t: 'Стабилен работодател', d: 'Верига супермаркети с 300+ обекта.' },
];
const POSITIONS = ['Продавач-консултант', 'Касиер', 'Старши продавач', 'Складов работник', 'Управител', 'Друго'];

export default function Apply() {
  const [f, setF] = useState({ name: '', phone: '', email: '', position: 'Продавач-консултант', city: '', message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set(k, v) { setF((s) => ({ ...s, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await api.apply(f); setDone(true); window.scrollTo({ top: 0 }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* лента */}
      <div style={{ background: 'var(--dark)', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span className="n300 ac" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, color: 'var(--orange-2)' }}>300</span>
        <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 1.5, lineHeight: 1 }}>ТРИСТА<br /><span style={{ fontSize: 8.5, color: '#b7ada6' }}>ВЕРИГА СУПЕРМАРКЕТИ</span></span>
        <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 13, color: '#c8beb7' }}>Кариери</span>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px 60px' }}>
        {done ? (
          <div className="card" style={{ padding: 46, textAlign: 'center', maxWidth: 560, margin: '30px auto' }}>
            <div style={{ color: 'var(--green)', marginBottom: 12 }}><Icon name="checkc" size={54} /></div>
            <h1 style={{ fontSize: 26, textTransform: 'uppercase' }}>Благодарим ти!</h1>
            <p className="muted" style={{ marginTop: 8, fontSize: 15.5 }}>
              Получихме кандидатурата ти. Наш колега ще се свърже с теб съвсем скоро.
            </p>
            <div style={{ marginTop: 18, fontWeight: 800, color: 'var(--orange)' }}>Твоята кариера в Триста започва тук! 🚀</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div className="eyebrow">Присъедини се към екипа</div>
              <h1 style={{ fontSize: 40, textTransform: 'uppercase', marginTop: 6 }}>Твоята кариера<br />започва <span style={{ color: 'var(--orange)' }}>тук</span></h1>
              <p className="muted" style={{ fontSize: 16, maxWidth: 560, margin: '10px auto 0' }}>
                Привличаме хора, които търсят <b style={{ color: 'var(--ink)' }}>развитие</b>, а не просто работа. Остави данните си — ще се свържем с теб.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 26 }}>
              {PERKS.map((p) => (
                <div key={p.t} className="card" style={{ padding: 16, display: 'flex', gap: 12 }}>
                  <div className="ic" style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--tint)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Icon name={p.icon} size={21} />
                  </div>
                  <div><b style={{ fontSize: 14.5 }}>{p.t}</b><div className="muted" style={{ fontSize: 12.5 }}>{p.d}</div></div>
                </div>
              ))}
            </div>

            <form className="card" style={{ padding: '26px 28px', maxWidth: 640, margin: '0 auto' }} onSubmit={submit}>
              <h2 style={{ fontSize: 22, textTransform: 'uppercase', marginBottom: 16 }}>Кандидатствай</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="field" style={{ gridColumn: '1 / -1' }}><label>Име и фамилия *</label>
                  <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="напр. Иван Иванов" required /></div>
                <div className="field"><label>Телефон</label>
                  <input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0888 ..." /></div>
                <div className="field"><label>Имейл</label>
                  <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="ime@email.bg" /></div>
                <div className="field"><label>Позиция</label>
                  <select value={f.position} onChange={(e) => set('position', e.target.value)}>
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div className="field"><label>Град</label>
                  <input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="напр. София" /></div>
                <div className="field" style={{ gridColumn: '1 / -1' }}><label>Съобщение (по избор)</label>
                  <textarea style={{ minHeight: 90 }} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="Разкажи ни накратко за себе си." /></div>
              </div>
              <div className="hint" style={{ marginBottom: 10 }}>Остави поне телефон или имейл, за да се свържем с теб.</div>
              {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
              <button className="btn block" disabled={busy}>{busy ? 'Изпращане…' : 'Изпрати кандидатура'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
