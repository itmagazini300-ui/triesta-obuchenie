import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';
import { Loading, Modal, initials } from '../components.jsx';
import { DISC, DISC_KEYS } from '../disc.jsx';

const BLANK = { name: '', email: '', phone: '', password: '', role: 'employee', store: '', position: '', mentor: '', start_date: '', is_mentor: 0, mentor_style: '', feedback_rating: '', retention_rate: '' };

const STORE_BLANK = { name: '', location_id: '', company_id: '', kind: 'магазин', address: '' };

function StoresSection({ stores, kinds, companies, reload }) {
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editing.id) await api.adminUpdateStore(editing.id, editing);
      else await api.adminCreateStore(editing);
      setEditing(null);
      reload();
    } catch (ex) { setErr(ex.message); }
  }
  async function remove(s) {
    if (!confirm(`Да изтрия ли обект „${s.name}“?`)) return;
    try { await api.adminDeleteStore(s.id); reload(); } catch (ex) { alert(ex.message); }
  }

  return (
    <>
      <div className="section-head" style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div className="eyebrow">Магазини и обекти · {stores.length}</div>
        <button className="btn sm" onClick={() => { setErr(''); setEditing({ ...STORE_BLANK }); }}><Icon name="plus" size={16} /> Нов обект</button>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>№</th><th>Обект</th><th>Вид</th><th>Фирма</th><th>Хора</th><th></th></tr></thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id} style={{ cursor: 'default' }}>
                <td className="muted tabnum">{s.location_id ?? '—'}</td>
                <td><b>{s.name}</b>{s.address && <div className="muted" style={{ fontSize: 12.5 }}>{s.address}</div>}</td>
                <td className="muted">{s.kind}</td>
                <td className="muted">{s.company_name || '—'}</td>
                <td className="tabnum">{s.people}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" title="Редакция" onClick={() => { setErr(''); setEditing({ id: s.id, name: s.name, location_id: s.location_id ?? '', company_id: s.company_id ?? '', kind: s.kind, address: s.address || '' }); }}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn danger" title="Изтрий" disabled={s.people > 0} onClick={() => remove(s)}><Icon name="trash" size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редакция на обект' : 'Нов обект'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="field"><label>Име</label>
                <input value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="напр. ВИТОША" /></div>
              <div className="field"><label>№ в Мистрал</label>
                <input type="number" value={editing.location_id} onChange={(e) => setEditing({ ...editing, location_id: e.target.value })} /></div>
              <div className="field"><label>Фирма</label>
                <select value={editing.company_id} onChange={(e) => setEditing({ ...editing, company_id: e.target.value })}>
                  <option value="">— без фирма —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div className="field"><label>Вид</label>
                <select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                  {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
                </select></div>
            </div>
            <div className="field"><label>Адрес</label>
              <input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={!editing.name.trim()}>Запази</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [stores, setStores] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.adminUsers().then((d) => setUsers(d.users));
    api.adminStores().then((d) => { setStores(d.stores); setKinds(d.kinds); });
    api.adminCompanies().then((d) => setCompanies(d.companies));
  }
  useEffect(() => { load(); }, []);
  if (!users) return <Loading />;

  const mentorNames = users.filter((u) => u.is_mentor).map((u) => u.name);

  async function remove(u) {
    if (!confirm(`Да изтрия ли акаунта на „${u.name}"?\nЦелият му прогрес по обученията ще се загуби.`)) return;
    try { await api.adminDeleteUser(u.id); load(); }
    catch (e) { alert(e.message); }
  }
  async function save() {
    setErr(''); setBusy(true);
    try {
      const payload = { ...editing };
      if (editing.id) await api.adminUpdateUser(editing.id, payload);
      else await api.adminCreateUser(payload);
      setEditing(null); load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Управление на хора</div>
        <h1>Служители и акаунти</h1>
        <p>Създавай акаунти, задавай роли и ментори, сменяй пароли. Служителите влизат с телефона си, управителите – с имейл.</p>
      </div>

      <div className="section-head">
        <div className="eyebrow">{users.length} акаунта</div>
        <button className="btn sm" onClick={() => { setErr(''); setEditing({ ...BLANK }); }}>
          <Icon name="plus" size={17} /> Нов акаунт
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr><th>Име</th><th>Телефон / имейл</th><th>Роля</th><th>Магазин</th><th>Ментор</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ cursor: 'default' }}>
                <td>
                  <div className="emp">
                    <div className="av">{initials(u.name)}</div>
                    <div><b>{u.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{u.position || '—'}</div></div>
                  </div>
                </td>
                <td className="muted">{u.phone ? `${u.phone.slice(0, 4)} ${u.phone.slice(4, 7)} ${u.phone.slice(7)}` : ''}{u.phone && u.email ? <br /> : null}{u.email}</td>
                <td>
                  {u.role === 'manager'
                    ? <span className="pill" style={{ background: 'var(--dark)', color: '#fff' }}>Управител</span>
                    : <span className="pill n">Служител</span>}
                  {u.is_mentor ? <span className="pill a" style={{ marginLeft: 6 }}><Icon name="grad" size={12} /> Ментор{u.mentor_style ? ' · ' + u.mentor_style : ''}</span> : null}
                </td>
                <td className="muted">{u.store || '—'}</td>
                <td className="muted">{u.mentor || '—'}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" title="Редакция" onClick={() => { setErr(''); setEditing({ ...u, store: stores.some((s) => s.name === u.store) ? u.store : '', password: '',phone: u.phone || '', email: u.email || '', mentor_style: u.mentor_style || '', feedback_rating: u.feedback_rating ?? '', retention_rate: u.retention_rate ?? '' }); }}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn danger" title="Изтрий" disabled={u.id === me.id} onClick={() => remove(u)}><Icon name="trash" size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StoresSection stores={stores} kinds={kinds} companies={companies} reload={load} />

      {editing && (
        <Modal title={editing.id ? 'Редакция на акаунт' : 'Нов акаунт'} onClose={() => setEditing(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field"><label>Име и фамилия</label>
              <input value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="field"><label>Телефон {editing.role === 'employee' ? '(за вход)' : '(по избор)'}</label>
              <input type="tel" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="0888 123 456" /></div>
            <div className="field"><label>Имейл {editing.role === 'manager' ? '(за вход)' : '(по избор)'}</label>
              <input value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="ime@trista.bg" /></div>
            <div className="field"><label>Роля</label>
              <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                <option value="employee">Служител</option>
                <option value="manager">Управител</option>
              </select></div>
            <div className="field"><label>{editing.id ? 'Нова парола (по избор)' : 'Парола'}</label>
              <input type="text" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} placeholder={editing.id ? 'остави празно за без промяна' : 'мин. 6 знака'} /></div>
            <div className="field"><label>Магазин</label>
              <select value={editing.store || ''} onChange={(e) => setEditing({ ...editing, store: e.target.value })}>
                <option value="">— без магазин —</option>
                {[...new Set(stores.map((s) => s.company_name || ''))]
                  .sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'bg'))
                  .map((co) => (
                    <optgroup key={co || 'none'} label={co || 'Без фирма'}>
                      {stores.filter((s) => (s.company_name || '') === co).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </optgroup>
                  ))}
              </select></div>
            <div className="field"><label>Длъжност</label>
              <input value={editing.position || ''} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></div>
            <div className="field"><label>Ментор</label>
              <select value={editing.mentor || ''} onChange={(e) => setEditing({ ...editing, mentor: e.target.value })}>
                <option value="">— без ментор —</option>
                {mentorNames.filter((n) => n !== editing.name).map((n) => <option key={n} value={n}>{n}</option>)}
              </select></div>
            <div className="field"><label>Дата на постъпване</label>
              <input value={editing.start_date || ''} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} placeholder="напр. 2025-06-01" /></div>
          </div>

          <div className="field" style={{ marginTop: 4, padding: '14px 16px', background: 'var(--tint-2)', borderRadius: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
              <input type="checkbox" checked={!!editing.is_mentor} onChange={(e) => setEditing({ ...editing, is_mentor: e.target.checked ? 1 : 0 })} />
              Този човек е <b>ментор</b> (обучава други служители и участва в KPI класацията)
            </label>
            {!!editing.is_mentor && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginTop: 12 }}>
                <div className="field" style={{ margin: 0, gridColumn: '1 / -1' }}><label>DISC стил на ментора</label>
                  <select value={editing.mentor_style || ''} onChange={(e) => setEditing({ ...editing, mentor_style: e.target.value })}>
                    <option value="">— избери —</option>
                    {DISC_KEYS.map((k) => <option key={k} value={k}>{k} · {DISC[k].name}</option>)}
                  </select></div>
                <div className="field" style={{ margin: 0 }}><label>Рейтинг от обучените (1–5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={editing.feedback_rating} onChange={(e) => setEditing({ ...editing, feedback_rating: e.target.value })} placeholder="напр. 4.8" /></div>
                <div className="field" style={{ margin: 0 }}><label>Задържане след 3 мес. (%)</label>
                  <input type="number" min="0" max="100" value={editing.retention_rate} onChange={(e) => setEditing({ ...editing, retention_rate: e.target.value })} placeholder="напр. 90" /></div>
              </div>
            )}
          </div>

          {err && <div className="err">{err}</div>}
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setEditing(null)}>Отказ</button>
            <button className="btn" disabled={busy} onClick={save}>{busy ? 'Запис…' : 'Запази'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
