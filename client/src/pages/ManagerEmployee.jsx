import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Bar, Ring, Loading, StatusPill, initials } from '../components.jsx';

export default function ManagerEmployee() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.managerEmployee(id).then(setData); }, [id]);
  if (!data) return <Loading />;

  const e = data.employee;
  const allModules = data.categories.flatMap((c) => c.modules.map((m) => ({ ...m, cat: c.title, icon: c.icon })));

  return (
    <div className="wrap">
      <Link to="/manager" className="back"><Icon name="arrowl" size={16} /> Всички служители</Link>

      {/* профил */}
      <div className="card" style={{ padding: 24, display: 'flex', gap: 22, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="av" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, flex: 'none' }}>
          {initials(e.name)}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 26, textTransform: 'uppercase' }}>{e.name}</h1>
          <div className="muted" style={{ marginTop: 4 }}>{[e.position, e.store, e.company].filter(Boolean).join(' · ')}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 8, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span><Icon name="users" size={14} /> Ментор: <b style={{ color: 'var(--ink)' }}>{e.mentor || '—'}</b></span>
            <span><Icon name="clock" size={14} /> От: <b style={{ color: 'var(--ink)' }}>{e.start_date || '—'}</b></span>
            {e.disc_result && <span><Icon name="spark" size={14} /> DISC: <b style={{ color: 'var(--orange)' }}>{e.disc_result}</b></span>}
          </div>
        </div>
        <Ring percent={data.overall} size={104} label="ОБЩО" />
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ fontSize: 11 }}>Текущо ниво</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{data.level}</div>
          <div className="muted" style={{ fontSize: 13 }}>{data.completedModules}/{data.totalModules} модула</div>
        </div>
      </div>

      {/* прогрес по категории */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', marginBottom: 22 }}>
        {data.categories.map((c) => (
          <div key={c.id} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div className="ic" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--tint)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name={c.icon} size={19} />
              </div>
              <b style={{ flex: 1, fontSize: 14.5 }}>{c.title}</b>
              <span className="tabnum" style={{ fontWeight: 900 }}>{c.percent}%</span>
            </div>
            <Bar percent={c.percent} />
          </div>
        ))}
      </div>

      {/* таблица по модули (като инфографиката) */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>Прогрес по модули</div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr><th>Модул</th><th>Категория</th><th>Статус</th><th>Оценка</th></tr>
          </thead>
          <tbody>
            {allModules.map((m) => (
              <tr key={m.id} style={{ cursor: 'default' }}>
                <td><b>{m.title}</b></td>
                <td className="muted">{m.cat}</td>
                <td><StatusPill status={m.status} /></td>
                <td className="tabnum" style={{ fontWeight: 800, color: m.status === 'completed' ? 'var(--green)' : 'var(--muted)' }}>
                  {m.status === 'completed' ? m.score + '%' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
