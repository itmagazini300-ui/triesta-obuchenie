import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal } from '../components.jsx';

export default function AdminCategory() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // module form
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.adminCategory(id).then(setData); }
  useEffect(() => { load(); }, [id]);
  if (!data) return <Loading />;

  const { category, modules } = data;

  async function move(mid, dir) { await api.adminMoveModule(mid, dir); load(); }
  async function remove(m) {
    if (!confirm(`Да изтрия ли модула „${m.title}" и неговия тест?`)) return;
    await api.adminDeleteModule(m.id); load();
  }
  async function save() {
    setErr(''); setBusy(true);
    try {
      if (editing.id) await api.adminUpdateModule(editing.id, editing);
      else await api.adminCreateModule({ ...editing, category_id: category.id });
      setEditing(null); load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <Link to="/admin" className="back"><Icon name="arrowl" size={16} /> Всички категории</Link>

      <div className="card" style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
        <div className="ic" style={{ width: 50, height: 50, borderRadius: 13, background: 'var(--tint)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name={category.icon} size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, textTransform: 'uppercase' }}>{category.title}</h1>
          <p className="muted" style={{ margin: '3px 0 0' }}>{category.description || 'Без описание'}</p>
        </div>
      </div>

      <div className="section-head">
        <div className="eyebrow">{modules.length} модула</div>
        <button className="btn sm" onClick={() => { setErr(''); setEditing({ title: '', summary: '', content: '', video_url: '' }); }}>
          <Icon name="plus" size={17} /> Нов модул
        </button>
      </div>

      <div className="card">
        {modules.length === 0 && <div className="empty">Още няма модули в тази категория.</div>}
        {modules.map((m, i) => (
          <div className="admin-row" key={m.id}>
            <div className="mv">
              <button disabled={i === 0} onClick={() => move(m.id, 'up')} aria-label="Нагоре"><Icon name="up" size={15} /></button>
              <button disabled={i === modules.length - 1} onClick={() => move(m.id, 'down')} aria-label="Надолу"><Icon name="down" size={15} /></button>
            </div>
            <div className="ic" style={{ background: 'var(--tint-2)', fontWeight: 900 }}>{i + 1}</div>
            <div className="grow" onClick={() => nav('/admin/module/' + m.id)}>
              <b>{m.title}</b>
              <span>{m.summary || 'Без резюме'}</span>
            </div>
            <div className="cnt">{m.questionCount} въпроса</div>
            <div className="admin-actions">
              <button className="icon-btn" title="Съдържание и тест" onClick={() => nav('/admin/module/' + m.id)}><Icon name="arrowr" size={18} /></button>
              <button className="icon-btn" title="Бърза редакция" onClick={() => { setErr(''); setEditing({ id: m.id, title: m.title, summary: m.summary || '', content: m.content || '', video_url: m.video_url || '' }); }}><Icon name="edit" size={18} /></button>
              <button className="icon-btn danger" title="Изтрий" onClick={() => remove(m)}><Icon name="trash" size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редакция на модул' : 'Нов модул'} onClose={() => setEditing(null)} wide>
          <div className="field">
            <label>Заглавие</label>
            <input value={editing.title} autoFocus onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="напр. Отваряне на смяна" />
          </div>
          <div className="field">
            <label>Кратко резюме</label>
            <input value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} placeholder="Едно изречение какво покрива модулът." />
          </div>
          <div className="field">
            <label>Съдържание на урока</label>
            <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Текстът на урока. Празен ред разделя параграфите." />
            <div className="hint">Остави празен ред между параграфите за по-добро форматиране.</div>
          </div>
          <div className="field">
            <label>Линк към видео (по избор)</label>
            <input value={editing.video_url} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} placeholder="https://…" />
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
