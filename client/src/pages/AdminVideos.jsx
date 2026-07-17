import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal } from '../components.jsx';
import { videoEmbed } from '../video.js';

const BLANK = { title: '', description: '', video_url: '', duration: '', category: '' };

export default function AdminVideos() {
  const [videos, setVideos] = useState(null);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.adminVideos().then((d) => setVideos(d.videos)); }
  useEffect(() => { load(); }, []);
  if (!videos) return <Loading />;

  async function move(id, dir) { await api.adminMoveVideo(id, dir); load(); }
  async function remove(v) {
    if (!confirm(`Да изтрия ли видеото „${v.title}"?`)) return;
    await api.adminDeleteVideo(v.id); load();
  }
  async function save() {
    setErr(''); setBusy(true);
    try {
      if (editing.id) await api.adminUpdateVideo(editing.id, editing);
      else await api.adminCreateVideo(editing);
      setEditing(null); load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const preview = editing ? videoEmbed(editing.video_url) : null;

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Управление на съдържанието</div>
        <h1>Видео уроци</h1>
        <p>Качвай обучителни видеа чрез линк (YouTube, Vimeo или .mp4). Служителите ги гледат в раздел „Видео уроци".</p>
      </div>

      <div className="section-head">
        <div className="eyebrow">{videos.length} видеа</div>
        <button className="btn sm" onClick={() => { setErr(''); setEditing({ ...BLANK }); }}>
          <Icon name="plus" size={17} /> Ново видео
        </button>
      </div>

      <div className="card">
        {videos.length === 0 && <div className="empty">Още няма видеа. Добави първото.</div>}
        {videos.map((v, i) => (
          <div className="admin-row" key={v.id}>
            <div className="mv">
              <button disabled={i === 0} onClick={() => move(v.id, 'up')} aria-label="Нагоре"><Icon name="up" size={15} /></button>
              <button disabled={i === videos.length - 1} onClick={() => move(v.id, 'down')} aria-label="Надолу"><Icon name="down" size={15} /></button>
            </div>
            <div className="ic"><Icon name="play" size={22} /></div>
            <div className="grow" onClick={() => { setErr(''); setEditing({ id: v.id, title: v.title, description: v.description || '', video_url: v.video_url || '', duration: v.duration ?? '', category: v.category || '' }); }}>
              <b>{v.title}</b>
              <span>{v.category ? v.category + ' · ' : ''}{v.video_url ? 'има видео линк' : 'без линк още'}</span>
            </div>
            <div className="cnt">{v.duration ? `~${v.duration} мин` : ''}</div>
            <div className="admin-actions">
              <button className="icon-btn" title="Редакция" onClick={() => { setErr(''); setEditing({ id: v.id, title: v.title, description: v.description || '', video_url: v.video_url || '', duration: v.duration ?? '', category: v.category || '' }); }}><Icon name="edit" size={18} /></button>
              <button className="icon-btn danger" title="Изтрий" onClick={() => remove(v)}><Icon name="trash" size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редакция на видео' : 'Ново видео'} onClose={() => setEditing(null)} wide>
          <div className="field">
            <label>Заглавие</label>
            <input value={editing.title} autoFocus onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="напр. Работа на каса" />
          </div>
          <div className="field">
            <label>Кратко описание</label>
            <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="За какво е видеото." />
          </div>
          <div className="field">
            <label>Линк към видеото</label>
            <input value={editing.video_url} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} placeholder="YouTube, Vimeo или .mp4 адрес" />
            <div className="hint">Постави линка от YouTube/Vimeo или директен .mp4 адрес.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field"><label>Категория (по избор)</label>
              <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="напр. Каса" /></div>
            <div className="field"><label>Времетраене (мин)</label>
              <input type="number" min="1" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} placeholder="напр. 3" /></div>
          </div>
          {preview && preview.type === 'iframe' && (
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
              <iframe src={preview.src} title="Преглед" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          )}
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
