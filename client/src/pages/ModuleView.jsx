import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, StatusPill } from '../components.jsx';
import { videoEmbed } from '../video.js';

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
        {m.duration ? (
          <div className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700 }}>
            <Icon name="clock" size={15} /> ~{m.duration} мин
          </div>
        ) : null}

        {(() => {
          const v = videoEmbed(m.video_url);
          const box = { margin: '18px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--tint)' };
          if (v && v.type === 'iframe') return (
            <div style={{ ...box, position: 'relative', paddingTop: '56.25%' }}>
              <iframe src={v.src} title={m.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          );
          if (v && v.type === 'video') return <video src={v.src} controls style={{ ...box, width: '100%', display: 'block', background: '#000' }} />;
          if (v && v.type === 'link') return (
            <div style={{ ...box, padding: 20, background: 'var(--tint-2)', textAlign: 'center' }}>
              <a className="btn" href={v.src} target="_blank" rel="noreferrer"><Icon name="play" size={18} /> Отвори видеото</a>
            </div>
          );
          return (
            <div style={{ ...box, background: 'var(--tint-2)', height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', gap: 8 }}>
              <Icon name="play" size={40} />
              <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 13 }}>Няма видео към този модул</span>
            </div>
          );
        })()}

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
