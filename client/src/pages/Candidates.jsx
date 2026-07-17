import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, initials } from '../components.jsx';

const STATUS = {
  new: { label: 'Нов', cls: 'a' },
  contacted: { label: 'Потърсен', cls: 'n' },
  interview: { label: 'Интервю', cls: 'a' },
  hired: { label: 'Нает', cls: 'g' },
  rejected: { label: 'Отказан', cls: 'n' },
};
const ORDER = ['new', 'contacted', 'interview', 'hired', 'rejected'];

export default function Candidates() {
  const [data, setData] = useState(null);
  const [qr, setQr] = useState('');
  const applyUrl = window.location.origin + '/apply';
  const [copied, setCopied] = useState(false);

  function load() { api.managerApplications().then(setData); }
  useEffect(() => {
    load();
    QRCode.toDataURL(applyUrl, { margin: 1, width: 220, color: { dark: '#1D1D1B', light: '#FFFFFF' } }).then(setQr).catch(() => {});
  }, []);
  if (!data) return <Loading />;

  async function setStatus(id, status) { await api.updateApplication(id, status); load(); }
  async function remove(a) {
    if (!confirm(`Да изтрия ли кандидатурата на „${a.name}"?`)) return;
    await api.deleteApplication(a.id); load();
  }
  function copyLink() { navigator.clipboard?.writeText(applyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Нов модел обяви за работа</div>
        <h1>Кандидати за работа</h1>
        <p>Сподели линка или QR кода в обяви, Facebook, Instagram и TikTok. Кандидатите попълват формата, а тук виждаш всички кандидатури.</p>
      </div>

      {/* QR + линк */}
      <div className="card" style={{ padding: 22, marginBottom: 22, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        {qr && <img src={qr} alt="QR код за кандидатстване" width={140} height={140} style={{ borderRadius: 12, border: '1px solid var(--line)' }} />}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="eyebrow" style={{ fontSize: 12 }}>Сканирай и кандидатствай</div>
          <h3 style={{ fontSize: 19, marginTop: 4 }}>Публична форма за кандидатстване</h3>
          <p className="muted" style={{ margin: '6px 0 12px', fontSize: 14 }}>Всеки с този линк или QR код може да кандидатства — без вход.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ background: 'var(--tint-2)', padding: '9px 12px', borderRadius: 9, fontSize: 13.5, wordBreak: 'break-all' }}>{applyUrl}</code>
            <button className="btn ghost sm" onClick={copyLink}>{copied ? 'Копирано ✓' : 'Копирай линка'}</button>
            <a className="btn sm" href={applyUrl} target="_blank" rel="noreferrer"><Icon name="arrowr" size={16} /> Отвори</a>
          </div>
        </div>
      </div>

      {/* брояч по статус */}
      <div className="stats">
        <div className="card stat"><div className="ic"><Icon name="users" size={24} /></div><div><b>{data.total}</b><span>всички кандидати</span></div></div>
        <div className="card stat"><div className="ic" style={{ background: 'var(--tint)', color: 'var(--orange)' }}><Icon name="spark" size={24} /></div><div><b>{data.counts.new}</b><span>нови</span></div></div>
        <div className="card stat"><div className="ic" style={{ background: 'var(--tint)', color: 'var(--orange)' }}><Icon name="users" size={24} /></div><div><b>{data.counts.interview}</b><span>на интервю</span></div></div>
        <div className="card stat"><div className="ic" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><Icon name="checkc" size={24} /></div><div><b>{data.counts.hired}</b><span>наети</span></div></div>
      </div>

      {/* списък */}
      <div className="card" style={{ overflowX: 'auto' }}>
        {data.applications.length === 0 ? (
          <div className="empty">Още няма кандидатури. Сподели линка/QR кода, за да получиш първите.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Кандидат</th><th>За връзка</th><th>Позиция</th><th>Град</th><th>Дата</th><th>Статус</th><th></th></tr>
            </thead>
            <tbody>
              {data.applications.map((a) => (
                <tr key={a.id} style={{ cursor: 'default' }}>
                  <td>
                    <div className="emp">
                      <div className="av">{initials(a.name)}</div>
                      <div><b>{a.name}</b>{a.message && <div className="muted" style={{ fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.message}>{a.message}</div>}</div>
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>
                    {a.phone && <div>{a.phone}</div>}
                    {a.email && <div>{a.email}</div>}
                  </td>
                  <td className="muted">{a.position || '—'}</td>
                  <td className="muted">{a.city || '—'}</td>
                  <td className="muted tabnum" style={{ fontSize: 13 }}>{(a.created_at || '').slice(0, 10)}</td>
                  <td>
                    <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 9, border: '1.5px solid var(--line)', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                      {ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                    </select>
                  </td>
                  <td><button className="icon-btn danger" title="Изтрий" onClick={() => remove(a)}><Icon name="trash" size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
