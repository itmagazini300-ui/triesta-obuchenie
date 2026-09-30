import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Bar, Loading, Modal } from '../components.jsx';

const BLANK = { name: '', eik: '', mol: '', address: '' };

function StoresTable({ stores, onOpen }) {
  if (!stores.length) return <div className="muted" style={{ padding: '10px 0' }}>Няма обекти.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead><tr><th>Обект</th><th>Вид</th><th>Хора</th><th style={{ width: 200 }}>Среден прогрес</th></tr></thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id} onClick={() => onOpen(s)} title="Виж служителите в таблото">
              <td><b>{s.name}</b>{s.address && <div className="muted" style={{ fontSize: 12.5 }}>{s.address}</div>}</td>
              <td className="muted">{s.kind}</td>
              <td className="tabnum">{s.people}</td>
              <td>{s.people ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flex: 1 }}><Bar percent={s.avgProgress} /></div><b className="tabnum">{s.avgProgress}%</b></div> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompanyCard({ c, open, onToggle, onEdit, onDelete, onOpenStore }) {
  return (
    <div className="card" style={{ padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ flex: '1 1 260px' }}>
          <b style={{ fontSize: 16 }}>{c.name}</b>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {[c.eik && `ЕИК ${c.eik}`, c.mol && `МОЛ: ${c.mol}`].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <div className="muted" style={{ fontSize: 13 }}><b style={{ color: 'var(--ink)' }}>{c.stores.length}</b> обекта · <b style={{ color: 'var(--ink)' }}>{c.people}</b> служители</div>
        <div style={{ width: 160, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><Bar percent={c.avgProgress} /></div><b className="tabnum">{c.avgProgress}%</b></div>
        {onEdit && (
          <div className="admin-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" title="Редакция" onClick={onEdit}><Icon name="edit" size={18} /></button>
            <button className="icon-btn danger" title={c.stores.length ? 'Първо премести обектите' : 'Изтрий'} disabled={c.stores.length > 0} onClick={onDelete}><Icon name="trash" size={18} /></button>
          </div>
        )}
      </div>
      {open && <div style={{ marginTop: 12 }}><StoresTable stores={c.stores} onOpen={onOpenStore} /></div>}
    </div>
  );
}

export default function Companies() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const [loadErr, setLoadErr] = useState(null);

  const load = () => api.adminCompanies().then((d) => { setLoadErr(null); setData(d); }).catch((ex) => setLoadErr(ex));
  useEffect(() => { load(); }, []);
  if (!data) {
    if (loadErr) {
      return (
        <div className="wrap">
          <div className="err">Фирмите не можаха да се заредят. Опитай отново.{loadErr.message ? ` (${loadErr.message})` : ''}</div>
        </div>
      );
    }
    return <Loading />;
  }

  const toggle = (key) => setOpen((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const openStore = (companyKey) => (s) => nav(`/manager?company=${companyKey}&store=${encodeURIComponent(s.name)}`);

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editing.id) await api.adminUpdateCompany(editing.id, editing);
      else await api.adminCreateCompany(editing);
      setEditing(null);
      load();
    } catch (ex) { setErr(ex.message); }
  }
  async function remove(c) {
    if (!confirm(`Да изтрия ли фирма „${c.name}“?`)) return;
    try { await api.adminDeleteCompany(c.id); load(); } catch (ex) { alert(ex.message); }
  }

  return (
    <div className="wrap">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Фирми · {data.companies.length}</div>
          <h1>Фирми и обекти</h1>
          <p>Всеки обект е към своята фирма. Натисни фирма, за да видиш обектите ѝ, и обект — за служителите в него.</p>
        </div>
        <button className="btn" onClick={() => { setErr(''); setEditing({ ...BLANK }); }}><Icon name="plus" size={17} /> Нова фирма</button>
      </div>

      {data.companies.map((c) => (
        <CompanyCard key={c.id} c={c} open={open.has(c.id)} onToggle={() => toggle(c.id)}
          onEdit={() => { setErr(''); setEditing({ id: c.id, name: c.name, eik: c.eik || '', mol: c.mol || '', address: c.address || '' }); }}
          onDelete={() => remove(c)} onOpenStore={openStore(c.id)} />
      ))}

      {data.unassigned.stores.length > 0 && (
        <CompanyCard c={{ name: 'Без фирма', ...data.unassigned }} open={open.has('none')} onToggle={() => toggle('none')} onOpenStore={openStore('none')} />
      )}

      {editing && (
        <Modal title={editing.id ? 'Редакция на фирма' : 'Нова фирма'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="field"><label>Име</label>
              <input value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="напр. „Нова Фирма“ ЕООД" /></div>
            <div className="field"><label>ЕИК</label>
              <input value={editing.eik} onChange={(e) => setEditing({ ...editing, eik: e.target.value })} placeholder="напр. BG202533515" /></div>
            <div className="field"><label>МОЛ</label>
              <input value={editing.mol} onChange={(e) => setEditing({ ...editing, mol: e.target.value })} /></div>
            <div className="field"><label>Адрес на управление</label>
              <input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={!editing.name.trim()}>Запази</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
