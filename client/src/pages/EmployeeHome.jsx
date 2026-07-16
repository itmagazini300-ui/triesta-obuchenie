import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';
import { Bar, Ring, Loading } from '../components.jsx';

const LEVELS = [
  { n: 'Начинаещ', d: 'Базови модули и правила', range: '0–40%' },
  { n: 'Уверен', d: 'Основни операции самостоятелно', range: '40–70%' },
  { n: 'Напреднал', d: 'Пълна самостоятелност', range: '70–100%' },
  { n: 'Ментор', d: 'Може да обучава други', range: '100%' },
];

export default function EmployeeHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { api.catalog().then(setData); }, []);
  if (!data) return <Loading />;

  const currentLevelIdx = LEVELS.findIndex((l) => l.n === data.level);

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Моите обучения</div>
        <h1>Здравей, {user.name.split(' ')[0]}!</h1>
        <p>Продължи обучението си. Завършените модули и оценки се виждат от твоя управител в реално време.</p>
      </div>

      {/* обобщение */}
      <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 26, marginBottom: 22, flexWrap: 'wrap' }}>
        <Ring percent={data.overall} size={110} label="ОБЩО" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange)', letterSpacing: 1, textTransform: 'uppercase' }}>Текущо ниво</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.02em' }}>{data.level}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {data.completedModules} от {data.totalModules} модула · {data.completedCategories} от {data.totalCategories} категории завършени
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {LEVELS.map((l, i) => (
            <div key={l.n} style={{ textAlign: 'center', opacity: i <= currentLevelIdx ? 1 : .4 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', margin: '0 auto 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff',
                background: i <= currentLevelIdx ? 'var(--orange)' : 'var(--grey)',
              }}>{i + 1}</div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{l.n}</div>
            </div>
          ))}
        </div>
      </div>

      {/* категории */}
      <div className="eyebrow" style={{ marginBottom: 12 }}>Категории обучения</div>
      <div className="catlist">
        {data.categories.map((c) => (
          <div key={c.id} className="card catcard" onClick={() => nav('/category/' + c.id)}>
            <div className="head">
              <div className="ic"><Icon name={c.icon} size={26} /></div>
              <div style={{ flex: 1 }}>
                <h3>{c.title}</h3>
                <div className="sub">{c.description}</div>
              </div>
              {c.completed && <span className="pill g"><Icon name="check" size={13} /> Готово</span>}
            </div>
            <div>
              <div className="meta" style={{ marginBottom: 7 }}>
                <span className="muted">{c.completedCount}/{c.moduleCount} модула</span>
                <span className="pct">{c.percent}%</span>
              </div>
              <Bar percent={c.percent} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
