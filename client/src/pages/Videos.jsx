import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Loading, Modal } from '../components.jsx';
import { videoEmbed } from '../video.js';

function Player({ url, title }) {
  const v = videoEmbed(url);
  const box = { borderRadius: 12, overflow: 'hidden', background: '#000' };
  if (v && v.type === 'iframe') return (
    <div style={{ ...box, position: 'relative', paddingTop: '56.25%' }}>
      <iframe src={v.src} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
    </div>
  );
  if (v && v.type === 'video') return <video src={v.src} controls autoPlay style={{ ...box, width: '100%', display: 'block' }} />;
  if (v && v.type === 'link') return (
    <div style={{ padding: 30, textAlign: 'center', background: 'var(--tint-2)', borderRadius: 12 }}>
      <a className="btn" href={v.src} target="_blank" rel="noreferrer"><Icon name="play" size={18} /> Отвори видеото</a>
    </div>
  );
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: 'var(--tint-2)', borderRadius: 12 }}>Видеото ще бъде добавено скоро.</div>;
}

export default function Videos() {
  const [videos, setVideos] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => { api.videos().then((d) => setVideos(d.videos)); }, []);
  if (!videos) return <Loading />;

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Учи от реалната работа</div>
        <h1>Видео уроци</h1>
        <p>Кратки, ясни и практически видеа от работата в нашите обекти. Гледай по всяко време — знанието остава достъпно винаги.</p>
      </div>

      {videos.length === 0 ? (
        <div className="card"><div className="empty">Още няма качени видеа.</div></div>
      ) : (
        <div className="catlist">
          {videos.map((v, i) => (
            <div key={v.id} className="card catcard" onClick={() => setOpen(v)}>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 150, background: 'linear-gradient(135deg, var(--dark), #3a3532)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.92)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={26} />
                </div>
                <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--orange)', color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>{i + 1}</span>
                {v.duration ? <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,.65)', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>~{v.duration} мин</span> : null}
              </div>
              <div>
                {v.category && <div className="eyebrow" style={{ fontSize: 11 }}>{v.category}</div>}
                <h3 style={{ marginTop: 2 }}>{v.title}</h3>
                {v.description && <div className="sub" style={{ marginTop: 4 }}>{v.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)} wide>
          <Player url={open.video_url} title={open.title} />
          {open.description && <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>{open.description}</p>}
        </Modal>
      )}
    </div>
  );
}
