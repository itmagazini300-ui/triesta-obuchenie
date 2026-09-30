import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Bar, Loading, initials } from '../components.jsx';

export default function ManagerHome() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const company = params.get('company') || '';
  const store = params.get('store') || '';
  const [data, setData] = useState(null);
  const [groups, setGroups] = useState(null);
  useEffect(() => { api.adminCompanies().then(setGroups); }, []);
  useEffect(() => { api.managerOverview({ company, store }).then(setData); }, [company, store]);
  if (!data || !groups) return <Loading />;

  const { stats, employees } = data;
  const storesOf = company === 'none' ? groups.unassigned.stores
    : company ? (groups.companies.find((c) => String(c.id) === company)?.stores || [])
    : [...groups.companies.flatMap((c) => c.stores), ...groups.unassigned.stores];
  const setFilter = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Интерфейс за управители</div>
        <h1>Обучение на екипа</h1>
        <p>Единен поглед върху развитието на всеки служител — кои модули са завършени, оценки и напредък в реално време.</p>
      </div>

      <div className="stats">
        <div className="card stat">
          <div className="ic"><Icon name="users" size={24} /></div>
          <div><b>{stats.total}</b><span>служители в обучение</span></div>
        </div>
        <div className="card stat">
          <div className="ic"><Icon name="trend" size={24} /></div>
          <div><b>{stats.avgProgress}%</b><span>среден прогрес · {stats.avgLevel}</span></div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><Icon name="checkc" size={24} /></div>
          <div><b>{stats.fullyTrained}</b><span>напълно обучени</span></div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: '#FBEAEA', color: '#C0392B' }}><Icon name="alert" size={24} /></div>
          <div><b>{stats.atRisk}</b><span>изостават (под 40%)</span></div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div className="field" style={{ margin: 0, flex: '1 1 240px' }}><label>Фирма</label>
          <select value={company} onChange={(e) => setFilter({ company: e.target.value })}>
            <option value="">Всички фирми</option>
            {groups.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">— без фирма —</option>
          </select></div>
        <div className="field" style={{ margin: 0, flex: '1 1 200px' }}><label>Обект</label>
          <select value={store} onChange={(e) => setFilter({ company, store: e.target.value })}>
            <option value="">Всички обекти</option>
            {storesOf.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select></div>
        {(company || store) && <button className="btn ghost sm" onClick={() => setFilter({})}>Изчисти</button>}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Служител</th><th>Магазин</th><th>Фирма</th><th>Ментор</th>
              <th style={{ width: 220 }}>Прогрес</th><th>Ниво</th><th>Модули</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} onClick={() => nav('/manager/employee/' + e.id)}>
                <td>
                  <div className="emp">
                    <div className="av">{initials(e.name)}</div>
                    <div><b>{e.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{e.position}</div></div>
                  </div>
                </td>
                <td className="muted">{e.store}</td>
                <td className="muted">{e.company || '—'}</td>
                <td className="muted">{e.mentor || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}><Bar percent={e.overall} /></div>
                    <b className="tabnum" style={{ width: 42, textAlign: 'right' }}>{e.overall}%</b>
                  </div>
                </td>
                <td><span className="pill n" style={{ background: 'var(--tint)', color: 'var(--orange-dk)' }}>{e.level}</span></td>
                <td className="tabnum muted">{e.completedModules}/{e.totalModules}</td>
              </tr>
            ))}
            {employees.length === 0 && <tr style={{ cursor: 'default' }}><td colSpan={7} className="muted">Няма служители за избрания филтър.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
