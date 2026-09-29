import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal, initials } from '../components.jsx';
import { DiscBadge } from '../disc.jsx';

const fmt = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' }) : '');
const phoneFmt = (p) => (p && p.length === 10 ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p);

// Менторите със същия стил – първи, после по натовареност и име.
function mentorOptions(mentors, style) {
  return [...mentors].sort((a, b) =>
    (b.mentor_style === style) - (a.mentor_style === style) || a.active - b.active || a.name.localeCompare(b.name, 'bg'));
}

function RequestCard({ r, mentors, onDone }) {
  const [mentorId, setMentorId] = useState(r.suggested_mentor?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function approve() {
    setErr(''); setBusy(true);
    try { onDone(await api.approveDiscRequest(r.id, Number(mentorId))); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function reject() {
    if (!confirm(`Да откажа ли заявката на „${r.name}“?`)) return;
    setErr(''); setBusy(true);
    try { await api.rejectDiscRequest(r.id); onDone(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="emp" style={{ flex: '1 1 220px' }}>
          <div className="av">{initials(r.name)}</div>
          <div><b>{r.name}</b><div className="muted" style={{ fontSize: 13 }}>{phoneFmt(r.phone)} · {fmt(r.created_at)}</div></div>
        </div>
        <DiscBadge style={r.disc_result} />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Ментор {r.suggested_mentor ? '(предложен от системата)' : '— няма ментор с този стил, избери ръчно'}</label>
        <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
          <option value="">— избери ментор —</option>
          {mentorOptions(mentors, r.disc_result).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.mentor_style || '?'} · {m.store || 'без магазин'} · обучава {m.active}
            </option>
          ))}
        </select>
      </div>

      {err && <div className="err">{err}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" disabled={busy || !mentorId} onClick={approve}><Icon name="check" size={17} /> Одобри</button>
        <button className="btn ghost" disabled={busy} onClick={reject}>Откажи</button>
      </div>
    </div>
  );
}

export default function Requests() {
  const [data, setData] = useState(null);
  const [created, setCreated] = useState(null); // { name, phone, password }
  const [copied, setCopied] = useState(false);

  function load() { api.discRequests().then(setData); }
  useEffect(() => { load(); }, []);
  if (!data) return <Loading />;

  function done(result) {
    if (result) { setCreated(result); setCopied(false); }
    load();
    window.dispatchEvent(new Event('requests-changed'));
  }
  async function copy() {
    const text = `Вход в Академия 300: ${window.location.origin}/login\nТелефон: ${created.phone}\nПарола: ${created.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Нови служители</div>
        <h1>Заявки от DISC теста</h1>
        <p>Кандидатите, одобрени на интервю, правят теста през QR кода. Системата предлага ментор със същия стил – потвърди или избери друг.</p>
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>{data.pending.length} чакащи</div>
      {data.pending.length === 0
        ? <div className="card" style={{ padding: 24 }} ><span className="muted">Няма чакащи заявки.</span></div>
        : <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
            {data.pending.map((r) => <RequestCard key={r.id + ':' + (r.suggested_mentor?.id ?? '')} r={r} mentors={data.mentors} onDone={done} />)}
          </div>}

      {data.history.length > 0 && (
        <details style={{ marginTop: 26 }}>
          <summary className="eyebrow" style={{ cursor: 'pointer' }}>История ({data.history.length})</summary>
          <div className="card" style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="table">
              <thead><tr><th>Име</th><th>Телефон</th><th>Стил</th><th>Решение</th><th>Дата</th></tr></thead>
              <tbody>
                {data.history.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td><b>{r.name}</b></td>
                    <td className="muted">{phoneFmt(r.phone)}</td>
                    <td><DiscBadge style={r.disc_result} /></td>
                    <td>{r.status === 'approved' ? <span className="pill g">Одобрена</span> : <span className="pill n">Отказана</span>}</td>
                    <td className="muted">{fmt(r.decided_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {created && (
        <Modal title="Акаунтът е създаден" onClose={() => setCreated(null)}>
          <p style={{ marginTop: 0 }}>Дай тези данни на <b>{created.name}</b>. Паролата се показва <b>само сега</b>.</p>
          <div style={{ background: 'var(--tint-2)', borderRadius: 12, padding: '14px 16px', fontSize: 16, lineHeight: 1.8 }}>
            Телефон: <b>{phoneFmt(created.phone)}</b><br />
            Парола: <b style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 2 }}>{created.password}</b>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={copy}>{copied ? 'Копирано ✓' : 'Копирай'}</button>
            <button className="btn" onClick={() => setCreated(null)}>Готово</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
