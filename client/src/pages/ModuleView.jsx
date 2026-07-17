import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, StatusPill } from '../components.jsx';

export default function ModuleView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [m, setM] = useState(null);

  useEffect(() => {
    api.module(id).then((data) => {
      setM(data);
      if (!data.locked) api.openModule(id).catch(() => {});
    });
  }, [id]);

  if (!m) return <Loading />;

  if (m.locked) {
    return (
      <div className="wrap" style={{ maxWidth: 640 }}>
        <Link to={'/category/' + m.category.id} className="back"><Icon name="arrowl" size={16} /> {m.category.title}</Link>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--muted)', marginBottom: 12 }}><Icon name="lock" size={44} /></div>
          <h1 style={{ fontSize: 22, textTransform: 'uppercase' }}>Модулът е заключен</h1>
          <p className="muted" style={{ marginTop: 8 }}>Завърши предишния модул в категорията, за да отключиш „{m.title}".</p>
          <Link to={'/category/' + m.category.id} className="btn" style={{ marginTop: 16 }}>Към категорията</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ maxWidth: 860 }}>
      <Link to={'/category/' + m.category.id} className="back"><Icon name="arrowl" size={16} /> {m.category.title}</Link>

      <div className="card lesson">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span className="eyebrow">Урок</span>
          <StatusPill status={m.status} />
          {m.status === 'completed' && <span className="sc" style={{ color: 'var(--green)', fontWeight: 900 }}>Оценка: {m.score}%</span>}
        </div>
        <h1 style={{ fontSize: 30, textTransform: 'uppercase', marginBottom: 4 }}>{m.title}</h1>
        <p className="muted" style={{ marginTop: 0 }}>{m.summary}</p>

        <div style={{
          margin: '18px 0', borderRadius: 12, background: 'var(--tint-2)', border: '1px solid var(--tint)',
          height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', gap: 8,
        }}>
          <Icon name="play" size={40} />
          <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 13 }}>Място за видео на урока (по избор)</span>
        </div>

        <div className="content">
          {m.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => nav('/module/' + m.id + '/test')}>
            <Icon name="checkc" size={18} /> {m.status === 'completed' ? 'Направи теста отново' : 'Към теста'}
          </button>
          <span className="muted" style={{ fontSize: 13.5 }}>
            {m.questions.length} въпроса · нужни са минимум {m.passScore}% за преминаване
          </span>
        </div>
      </div>
    </div>
  );
}
