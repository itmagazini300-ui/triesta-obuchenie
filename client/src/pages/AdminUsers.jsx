import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';
import { Loading, Modal, initials } from '../components.jsx';

const BLANK = { name: '', email: '', password: '', role: 'employee', store: '', position: '', mentor: '', start_date: '', is_mentor: 0, feedback_rating: '', retention_rate: '' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.adminUsers().then((d) => setUsers(d.users)); }
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
        <p>Създавай акаунти, задавай роли и ментори, сменяй пароли. Служителите влизат с имейла и паролата, които зададеш тук.</p>
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
            <tr><th>Име</th><th>Имейл</th><th>Роля</th><th>Магазин</th><th>Ментор</th><th></th></tr>
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
                <td className="muted">{u.email}</td>
                <td>
                  {u.role === 'manager'
                    ? <span className="pill" style={{ background: 'var(--dark)', color: '#fff' }}>Управител</span>
                    : <span className="pill n">Служител</span>}
                  {u.is_mentor ? <span className="pill a" style={{ marginLeft: 6 }}><Icon name="grad" size={12} /> Ментор</span> : null}
                </td>
                <td className="muted">{u.store || '—'}</td>
                <td className="muted">{u.mentor || '—'}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" title="Редакция" onClick={() => { setErr(''); setEditing({ ...u, password: '', feedback_rating: u.feedback_rating ?? '', retention_rate: u.retention_rate ?? '' }); }}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn danger" title="Изтрий" disabled={u.id === me.id} onClick={() => remove(u)}><Icon name="trash" size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редакция на акаунт' : 'Нов акаунт'} onClose={() => setEditing(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field"><label>Име и фамилия</label>
              <input value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="field"><label>Имейл (за вход)</label>
              <input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="ime@triesta.bg" /></div>
            <div className="field"><label>Роля</label>
              <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                <option value="employee">Служител</option>
                <option value="manager">Управител</option>
              </select></div>
            <div className="field"><label>{editing.id ? 'Нова парола (по избор)' : 'Парола'}</label>
              <input type="text" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} placeholder={editing.id ? 'остави празно за без промяна' : 'мин. 6 знака'} /></div>
            <div className="field"><label>Магазин</label>
              <input value={editing.store || ''} onChange={(e) => setEditing({ ...editing, store: e.target.value })} /></div>
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
