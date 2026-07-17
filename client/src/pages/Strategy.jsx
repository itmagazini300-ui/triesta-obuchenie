import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';

const PILLARS = [
  { icon: 'laptop', t: 'Дигитализация', d: 'Единна платформа за обучение, тестове и проследяване.' },
  { icon: 'grad', t: 'Обучение', d: 'Модули, видеа и тестове по общ стандарт за всички магазини.' },
  { icon: 'trend', t: 'Развитие', d: 'Ясен път за израстване — от служител до ментор.' },
  { icon: 'heartteam', t: 'Задържане', d: 'Уверени и подкрепени служители остават по-дълго.' },
];

const BENEFITS = [
  { icon: 'clock', t: 'По-бързо въвеждане на нови служители', d: 'Намалява времето, в което новият човек е неефективен.' },
  { icon: 'checkc', t: 'Намаляване на грешките в работата', d: 'По-малко загуби, по-добро обслужване, по-малко напрежение.' },
  { icon: 'users', t: 'По-добро задържане на персонала', d: 'Служителите се чувстват уверени, което намалява текучеството.' },
  { icon: 'store', t: 'Уеднаквяване на стандартите', d: 'Независимо кой обучава, нивото на работа остава постоянно.' },
  { icon: 'shield', t: 'По-малко зависимост от конкретни хора', d: 'Знанието остава в системата, а не в отделни служители.' },
  { icon: 'trend', t: 'По-бързо разширяване и развитие', d: 'Нови обекти и хора се обучават по-лесно и по-бързо.' },
  { icon: 'gear', t: 'Оптимизация на времето на управителите', d: 'По-малко обяснения, повече време за контрол и развитие.' },
];

export default function Strategy() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.managerOverview().then((d) => setStats(d.stats)).catch(() => {}); }, []);

  return (
    <div className="wrap">
      {/* герой */}
      <div className="card" style={{ padding: '30px 32px', marginBottom: 22, background: 'linear-gradient(100deg, var(--orange), var(--orange-2))', color: '#fff', border: 0 }}>
        <div className="eyebrow" style={{ color: '#fff', opacity: .9 }}>За хранителни магазини „Триста"</div>
        <h1 style={{ fontSize: 40, textTransform: 'uppercase', marginTop: 6 }}>Годишна стратегия</h1>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10, fontWeight: 800, fontSize: 17 }}>
          <span>Дигитализация</span><span style={{ opacity: .6 }}>|</span>
          <span>Обучение</span><span style={{ opacity: .6 }}>|</span>
          <span>Развитие</span><span style={{ opacity: .6 }}>|</span>
          <span>Задържане</span>
        </div>
      </div>

      {/* живи числа */}
      {stats && (
        <div className="stats">
          <div className="card stat"><div className="ic"><Icon name="users" size={24} /></div><div><b>{stats.total}</b><span>служители в обучение</span></div></div>
          <div className="card stat"><div className="ic"><Icon name="trend" size={24} /></div><div><b>{stats.avgProgress}%</b><span>среден прогрес на екипа</span></div></div>
          <div className="card stat"><div className="ic" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><Icon name="checkc" size={24} /></div><div><b>{stats.fullyTrained}</b><span>напълно обучени</span></div></div>
          <div className="card stat"><div className="ic" style={{ background: '#FBEAEA', color: '#C0392B' }}><Icon name="alert" size={24} /></div><div><b>{stats.atRisk}</b><span>изостават (под 40%)</span></div></div>
        </div>
      )}

      {/* стълбове */}
      <div className="eyebrow" style={{ margin: '4px 0 12px' }}>Четирите стълба</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', marginBottom: 24 }}>
        {PILLARS.map((p) => (
          <div key={p.t} className="card" style={{ padding: 20 }}>
            <div className="ic" style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--tint)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name={p.icon} size={26} />
            </div>
            <h3 style={{ fontSize: 17, textTransform: 'uppercase' }}>{p.t}</h3>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>{p.d}</p>
          </div>
        ))}
      </div>

      {/* ползи за бизнеса */}
      <div className="eyebrow" style={{ marginBottom: 12 }}>Защо това е полезно за бизнеса</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        {BENEFITS.map((b) => (
          <div key={b.t} className="card" style={{ padding: '18px 20px', display: 'flex', gap: 14 }}>
            <div className="ic" style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--tint)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name={b.icon} size={22} />
            </div>
            <div><b style={{ fontSize: 15 }}>{b.t}</b><p className="muted" style={{ margin: '3px 0 0', fontSize: 13.5 }}>{b.d}</p></div>
          </div>
        ))}
      </div>

      {/* заключение */}
      <div className="card" style={{ marginTop: 22, padding: '22px 26px', background: 'var(--dark)', color: '#fff', border: 0, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div className="ic" style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="trend" size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 800, opacity: .85, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>Дигитална система за обучение и развитие</div>
          <div style={{ fontSize: 19, fontWeight: 900 }}>По-ниски разходи, по-стабилни екипи и по-високи обороти.</div>
        </div>
        <Link to="/manager" className="btn ghost" style={{ background: '#fff' }}>Към таблото</Link>
      </div>
    </div>
  );
}
