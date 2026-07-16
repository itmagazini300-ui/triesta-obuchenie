import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal, IconPicker } from '../components.jsx';

export default function AdminCategories() {
  const nav = useNavigate();
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null); // {id?, title, icon, description}
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.adminCategories().then((d) => setCats(d.categories)); }
  useEffect(() => { load(); }, []);
  if (!cats) return <Loading />;

  async function move(id, dir) { await api.adminMoveCategory(id, dir); load(); }
  async function remove(c) {
    if (!confirm(`Да изтрия ли категорията „${c.title}" с всичките ѝ ${c.moduleCount} модула?\nЦелият прогрес на служителите по нея ще се загуби.`)) return;
    await api.adminDeleteCategory(c.id); load();
  }
  async function save() {
    setErr(''); setBusy(true);
    try {
      if (editing.id) await api.adminUpdateCategory(editing.id, editing);
      else await api.adminCreateCategory(editing);
      setEditing(null); load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Управление на съдържанието</div>
        <h1>Категории обучения</h1>
        <p>Добавяй и подреждай категориите, модулите и тестовите въпроси. Промените са видими веднага за служителите.</p>
      </div>

      <div className="section-head">
        <div className="eyebrow">{cats.length} категории</div>
        <button className="btn sm" onClick={() => { setErr(''); setEditing({ title: '', icon: 'book', description: '' }); }}>
          <Icon name="plus" size={17} /> Нова категория
        </button>
      </div>

      <div className="card">
        {cats.length === 0 && <div className="empty">Още няма категории. Добави първата.</div>}
        {cats.map((c, i) => (
          <div className="admin-row" key={c.id}>
            <div className="mv">
              <button disabled={i === 0} onClick={() => move(c.id, 'up')} aria-label="Нагоре"><Icon name="up" size={15} /></button>
              <button disabled={i === cats.length - 1} onClick={() => move(c.id, 'down')} aria-label="Надолу"><Icon name="down" size={15} /></button>
            </div>
            <div className="ic"><Icon name={c.icon} size={23} /></div>
            <div className="grow" onClick={() => nav('/admin/category/' + c.id)}>
              <b>{c.title}</b>
              <span>{c.description || 'Без описание'}</span>
            </div>
            <div className="cnt">{c.moduleCount} модула · {c.questionCount} въпроса</div>
            <div className="admin-actions">
              <button className="icon-btn" title="Модули" onClick={() => nav('/admin/category/' + c.id)}><Icon name="arrowr" size={18} /></button>
              <button className="icon-btn" title="Редакция" onClick={() => { setErr(''); setEditing({ id: c.id, title: c.title, icon: c.icon, description: c.description || '' }); }}><Icon name="edit" size={18} /></button>
              <button className="icon-btn danger" title="Изтрий" onClick={() => remove(c)}><Icon name="trash" size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редакция на категория' : 'Нова категория'} onClose={() => setEditing(null)}>
          <div className="field">
            <label>Име на категорията</label>
            <input value={editing.title} autoFocus onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="напр. Работа на каса" />
          </div>
          <div className="field">
            <label>Икона</label>
            <IconPicker value={editing.icon} onChange={(icon) => setEditing({ ...editing, icon })} />
          </div>
          <div className="field">
            <label>Кратко описание</label>
            <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="напр. Плащания, отчет и касова дисциплина." />
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
