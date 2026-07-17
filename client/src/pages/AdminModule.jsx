import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal } from '../components.jsx';

export default function AdminModule() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [savingMod, setSavingMod] = useState(false);
  const [modMsg, setModMsg] = useState('');
  const [qEdit, setQEdit] = useState(null); // question modal state
  const [qErr, setQErr] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [imp, setImp] = useState(null); // {text} import modal
  const [impRes, setImpRes] = useState(null);
  const [impBusy, setImpBusy] = useState(false);

  function load() {
    api.adminModule(id).then((d) => {
      setData(d);
      setForm({ title: d.module.title, summary: d.module.summary || '', content: d.module.content || '', video_url: d.module.video_url || '', duration: d.module.duration ?? '' });
    });
  }
  useEffect(() => { load(); }, [id]);
  if (!data || !form) return <Loading />;

  async function saveModule() {
    setSavingMod(true); setModMsg('');
    try { await api.adminUpdateModule(id, form); setModMsg('Запазено ✓'); setTimeout(() => setModMsg(''), 2500); }
    catch (e) { setModMsg(e.message); }
    finally { setSavingMod(false); }
  }

  async function moveQ(qid, dir) { await api.adminMoveQuestion(qid, dir); load(); }
  async function removeQ(q) {
    if (!confirm('Да изтрия ли този въпрос?')) return;
    await api.adminDeleteQuestion(q.id); load();
  }
  function newQuestion() { setQErr(''); setQEdit({ text: '', options: ['', '', '', ''], correct_index: 0 }); }
  function editQuestion(q) { setQErr(''); setQEdit({ id: q.id, text: q.text, options: [...q.options], correct_index: q.correct_index }); }

  async function saveQuestion() {
    setQErr(''); setQBusy(true);
    try {
      const payload = { text: qEdit.text, options: qEdit.options, correct_index: qEdit.correct_index };
      if (qEdit.id) await api.adminUpdateQuestion(qEdit.id, payload);
      else await api.adminCreateQuestion({ ...payload, module_id: Number(id) });
      setQEdit(null); load();
    } catch (e) { setQErr(e.message); }
    finally { setQBusy(false); }
  }

  async function runImport() {
    setImpBusy(true); setImpRes(null);
    try {
      const r = await api.adminImportQuestions(id, imp.text);
      setImpRes(r);
      if (r.added > 0) load();
    } catch (e) { setImpRes({ error: e.message }); }
    finally { setImpBusy(false); }
  }
  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImp({ text: String(reader.result || '') });
    reader.readAsText(f, 'utf-8');
  }

  function setOpt(i, val) { setQEdit((s) => ({ ...s, options: s.options.map((o, k) => (k === i ? val : o)) })); }
  function addOpt() { setQEdit((s) => (s.options.length >= 6 ? s : { ...s, options: [...s.options, ''] })); }
  function removeOpt(i) {
    setQEdit((s) => {
      if (s.options.length <= 2) return s;
      const options = s.options.filter((_, k) => k !== i);
      let correct_index = s.correct_index;
      if (i === correct_index) correct_index = 0;
      else if (i < correct_index) correct_index -= 1;
      return { ...s, options, correct_index };
    });
  }

  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <Link to={'/admin/category/' + data.category.id} className="back"><Icon name="arrowl" size={16} /> {data.category.title}</Link>

      {/* Урок */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Съдържание на урока</div>
        <div className="field">
          <label>Заглавие</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Кратко резюме</label>
          <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        <div className="field">
          <label>Текст на урока</label>
          <textarea style={{ minHeight: 200 }} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Празен ред разделя параграфите." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 16px' }}>
          <div className="field">
            <label>Линк към видео (по избор)</label>
            <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="YouTube, Vimeo или .mp4" />
          </div>
          <div className="field">
            <label>Времетраене (мин)</label>
            <input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="напр. 3" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn" disabled={savingMod} onClick={saveModule}>{savingMod ? 'Запис…' : 'Запази урока'}</button>
          {modMsg && <span style={{ fontWeight: 700, color: modMsg.includes('✓') ? 'var(--green)' : '#C0392B' }}>{modMsg}</span>}
        </div>
      </div>

      {/* Тест */}
      <div className="section-head">
        <div className="eyebrow">Тест · {data.questions.length} въпроса</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost sm" onClick={() => { setImpRes(null); setImp({ text: '' }); }}><Icon name="box" size={16} /> Импорт от CSV</button>
          <button className="btn sm" onClick={newQuestion}><Icon name="plus" size={17} /> Нов въпрос</button>
        </div>
      </div>

      <div className="card" style={{ padding: '4px 22px' }}>
        {data.questions.length === 0 && <div className="empty">Още няма въпроси. Добави поне 1, за да има тест.</div>}
        {data.questions.map((q, i) => (
          <div className="qadmin" key={q.id}>
            <div className="qh">
              <div className="mv">
                <button disabled={i === 0} onClick={() => moveQ(q.id, 'up')}><Icon name="up" size={15} /></button>
                <button disabled={i === data.questions.length - 1} onClick={() => moveQ(q.id, 'down')}><Icon name="down" size={15} /></button>
              </div>
              <b>{i + 1}. {q.text}</b>
              <div className="admin-actions">
                <button className="icon-btn" onClick={() => editQuestion(q)} title="Редакция"><Icon name="edit" size={17} /></button>
                <button className="icon-btn danger" onClick={() => removeQ(q)} title="Изтрий"><Icon name="trash" size={17} /></button>
              </div>
            </div>
            <ul>
              {q.options.map((o, k) => (
                <li key={k} className={k === q.correct_index ? 'ok' : ''}>
                  <span className="mk">{k === q.correct_index ? <Icon name="check" size={14} /> : '•'}</span>{o}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {qEdit && (
        <Modal title={qEdit.id ? 'Редакция на въпрос' : 'Нов въпрос'} onClose={() => setQEdit(null)} wide>
          <div className="field">
            <label>Въпрос</label>
            <input value={qEdit.text} autoFocus onChange={(e) => setQEdit({ ...qEdit, text: e.target.value })} placeholder="напр. Под какъв код работи касиерът?" />
          </div>
          <div className="field">
            <label>Възможни отговори <span className="hint" style={{ display: 'inline' }}>(маркирай верния отляво)</span></label>
            {qEdit.options.map((o, i) => (
              <div className="opt-edit" key={i}>
                <button type="button" className={'radio' + (qEdit.correct_index === i ? ' on' : '')} onClick={() => setQEdit({ ...qEdit, correct_index: i })} title="Верен отговор" />
                <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Отговор ${i + 1}`} />
                <button type="button" className="icon-btn danger" disabled={qEdit.options.length <= 2} onClick={() => removeOpt(i)} title="Премахни"><Icon name="close" size={16} /></button>
              </div>
            ))}
            {qEdit.options.length < 6 && (
              <button type="button" className="btn ghost sm" onClick={addOpt} style={{ marginTop: 4 }}><Icon name="plus" size={15} /> Още отговор</button>
            )}
          </div>
          {qErr && <div className="err">{qErr}</div>}
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setQEdit(null)}>Отказ</button>
            <button className="btn" disabled={qBusy} onClick={saveQuestion}>{qBusy ? 'Запис…' : 'Запази въпроса'}</button>
          </div>
        </Modal>
      )}

      {imp && (
        <Modal title="Импорт на въпроси от CSV" onClose={() => { setImp(null); setImpRes(null); }} wide>
          <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
            Всеки ред е един въпрос по формата:<br />
            <code style={{ background: 'var(--tint-2)', padding: '3px 7px', borderRadius: 6, display: 'inline-block', margin: '6px 0', fontSize: 13 }}>
              Въпрос ; Отговор 1 ; Отговор 2 ; … ; №&nbsp;на&nbsp;верния
            </code><br />
            Последната колона е номерът на верния отговор (1, 2, 3…). Разделител: <b>;</b> или <b>,</b>. Може да поставиш текст от Excel/Google Sheets или да качиш <b>.csv</b> файл.
          </p>
          <div className="field">
            <label>Данни (постави тук)</label>
            <textarea style={{ minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
              value={imp.text} onChange={(e) => setImp({ text: e.target.value })}
              placeholder={'Под какъв код работи касиерът?;Общ;Собствен личен код;Без код;2\nКолко е 2+2?;3;4;5;2'} />
            <div className="hint" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Съвет: подготви въпросите в таблица и запази като CSV.</span>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                <Icon name="box" size={15} /> Качи .csv файл
                <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={onFile} />
              </label>
            </div>
          </div>

          {impRes && (impRes.error
            ? <div className="err">{impRes.error}</div>
            : <div className="result-banner" style={{ padding: '14px 18px', textAlign: 'left', background: impRes.added ? 'var(--green-bg)' : '#FBEAEA', border: 0 }}>
                <b style={{ color: impRes.added ? 'var(--green)' : '#C0392B' }}>Добавени {impRes.added} от {impRes.total} реда.</b>
                {impRes.errors?.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
                    {impRes.errors.map((er, k) => <li key={k}>Ред {er.line}: {er.msg}</li>)}
                  </ul>
                )}
              </div>
          )}

          <div className="modal-foot">
            <button className="btn ghost" onClick={() => { setImp(null); setImpRes(null); }}>Затвори</button>
            <button className="btn" disabled={impBusy || !imp.text.trim()} onClick={runImport}>{impBusy ? 'Импорт…' : 'Импортирай'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
