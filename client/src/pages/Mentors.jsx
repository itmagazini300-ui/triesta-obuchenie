import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { Bar, Loading, initials } from '../components.jsx';
import QRCode from 'qrcode';
import { DiscBadge } from '../disc.jsx';

function Stars({ value }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <b className="tabnum">{value ? value.toFixed(1) : '—'}</b>
      <span style={{ color: 'var(--amber)', letterSpacing: 1 }}>
        {'★'.repeat(Math.round(value || 0))}<span style={{ color: 'var(--line)' }}>{'★'.repeat(5 - Math.round(value || 0))}</span>
      </span>
    </span>
  );
}

export default function Mentors() {
  const [data, setData] = useState(null);
  const [qr, setQr] = useState('');
  const discUrl = window.location.origin + '/disc-start';
  function load() { api.managerMentors().then(setData); }
  useEffect(() => {
    load();
    QRCode.toDataURL(discUrl, { margin: 1, width: 600, color: { dark: '#1D1D1B', light: '#FFFFFF' } }).then(setQr).catch(() => {});
  }, []);

  async function complete(p) {
    if (!confirm(`„${p.name}“ завърши ли обучението при ментора си?`)) return;
    try { await api.completeMentee(p.id); load(); }
    catch (e) { alert(e.message); }
  }
  if (!data) return <Loading />;

  const { mentors, stats, bonusBands, yearBonus, mentorOfYearId } = data;
  const top = mentors.find((m) => m.id === mentorOfYearId);

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Анализ на менторите</div>
        <h1>Ментори и KPI система</h1>
        <p>Измерваме резултатите, за да развиваме хората и системата. Бонусът зависи от успеваемостта на обучените служители.</p>
      </div>

      <div className="stats">
        <div className="card stat"><div className="ic"><Icon name="users" size={24} /></div><div><b>{stats.total}</b><span>активни ментори</span></div></div>
        <div className="card stat"><div className="ic"><Icon name="grad" size={24} /></div><div><b>{stats.totalMentees}</b><span>обучавани служители</span></div></div>
        <div className="card stat"><div className="ic" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><Icon name="checkc" size={24} /></div><div><b>{stats.avgSuccess}%</b><span>средна успеваемост</span></div></div>
        <div className="card stat"><div className="ic" style={{ background: 'var(--amber-bg)', color: '#B9790B' }}><Icon name="spark" size={24} /></div><div><b>{stats.avgFeedback}</b><span>среден рейтинг (от 5)</span></div></div>
      </div>

      {/* Ментор на годината */}
      {top && (
        <div className="card" style={{ padding: '22px 26px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(100deg, var(--orange), var(--orange-2))', color: '#fff', border: 0, flexWrap: 'wrap' }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="trophy" size={34} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, letterSpacing: 1, fontSize: 13, opacity: .9, textTransform: 'uppercase' }}>Ментор на годината</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{top.name}</div>
            <div style={{ opacity: .92, fontSize: 14 }}>{top.successRate}% успеваемост · {top.feedback.toFixed(1)}/5 рейтинг · {top.retention}% задържане</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 34, fontWeight: 900 }}>{yearBonus} €</div>
            <div style={{ opacity: .9, fontSize: 13, fontWeight: 700 }}>годишен бонус</div>
          </div>
        </div>
      )}

      {/* QR код за новите служители */}
      <div className="card" style={{ padding: 20, marginBottom: 22, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {qr && <img src={qr} alt="QR код за DISC теста" width={130} height={130} style={{ borderRadius: 12, border: '1px solid var(--line)' }} />}
        <div style={{ flex: '1 1 260px' }}>
          <b style={{ fontSize: 17 }}>QR код за нови служители</b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>Кандидат, одобрен на интервю, сканира кода и прави DISC теста. Заявката идва в „Заявки“.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {qr && <a className="btn sm" href={qr} download="QR-DISC-test-Akademiya-300.png">Изтегли за печат</a>}
            <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>{discUrl}</span>
          </div>
        </div>
      </div>

      {/* Кой кого обучава в момента */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>Кой кого обучава сега · {stats.totalActive} в обучение</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginBottom: 22 }}>
        {[...mentors].sort((a, b) => (a.mentor_style || 'Z').localeCompare(b.mentor_style || 'Z') || a.name.localeCompare(b.name, 'bg')).map((m) => (
          <div key={m.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 16 }}>{m.name}</b>
              <DiscBadge style={m.mentor_style} />
            </div>
            <div className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>{m.store || 'без магазин'} · обучава <b>{m.active}</b></div>
            {m.activeList.length === 0
              ? <div className="muted" style={{ fontSize: 13.5 }}>В момента не обучава никого.</div>
              : m.activeList.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                    <span style={{ flex: 1 }}>{p.name}<span className="muted" style={{ fontSize: 12.5 }}>{p.start_date ? ` · от ${p.start_date}` : ''}</span></span>
                    <button className="btn ghost sm" onClick={() => complete(p)}>Завършил</button>
                  </div>
                ))}
            {m.doneList.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary className="muted" style={{ cursor: 'pointer', fontSize: 13 }}>Завършили ({m.doneList.length})</summary>
                {m.doneList.map((p) => <div key={p.id} className="muted" style={{ fontSize: 13, padding: '3px 0' }}>{p.name} · {p.mentorship_done_at.slice(0, 10)}</div>)}
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Рейтинг на менторите */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>Рейтинг на менторите</div>
      <div className="card" style={{ overflowX: 'auto', marginBottom: 22 }}>
        <table className="table">
          <thead>
            <tr><th>#</th><th>Ментор</th><th>Обучени</th><th style={{ width: 180 }}>Успеваемост</th><th>Рейтинг</th><th>Задържане</th><th>Месечен бонус</th></tr>
          </thead>
          <tbody>
            {mentors.map((m, i) => (
              <tr key={m.id} style={{ cursor: 'default' }}>
                <td style={{ fontWeight: 900, color: 'var(--orange)' }}>{i + 1}</td>
                <td>
                  <div className="emp">
                    <div className="av">{initials(m.name)}</div>
                    <div>
                      <b>{m.name}{m.id === mentorOfYearId && <span className="pill a" style={{ marginLeft: 8 }}><Icon name="trophy" size={12} /> №1</span>}</b>
                      <div className="muted" style={{ fontSize: 12.5 }}>{m.position} · {m.store}</div>
                    </div>
                  </div>
                </td>
                <td className="tabnum">{m.passed}/{m.mentees}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}><Bar percent={m.successRate} /></div>
                    <b className="tabnum" style={{ width: 40, textAlign: 'right' }}>{m.successRate}%</b>
                  </div>
                </td>
                <td><Stars value={m.feedback} /></td>
                <td className="tabnum">{m.retention}%</td>
                <td>
                  <span className={'pill ' + (m.bonus >= 100 ? 'g' : m.bonus > 0 ? 'a' : 'n')} style={{ fontSize: 13 }}>{m.bonus} € / мес.</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Бонус система */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>Бонус система за ментори</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
        {bonusBands.map((band, i) => {
          const tone = band.amount >= 100 ? 'var(--green)' : band.amount > 0 ? 'var(--amber)' : 'var(--grey)';
          return (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span className="pill" style={{ background: 'var(--tint-2)', color: tone, border: `1.5px solid ${tone}` }}>{band.range}</span>
                <b style={{ fontSize: 24, marginLeft: 'auto', color: tone }}>{band.amount} €</b>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{band.note}</p>
            </div>
          );
        })}
        <div className="card" style={{ padding: 20, border: '1.5px solid var(--orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ color: 'var(--orange)' }}><Icon name="trophy" size={22} /></span>
            <b style={{ fontSize: 15, textTransform: 'uppercase' }}>Ментор на годината</b>
            <b style={{ fontSize: 24, marginLeft: 'auto', color: 'var(--orange)' }}>{yearBonus} €</b>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>За най-високи резултати и принос към обучителната система.</p>
        </div>
      </div>
    </div>
  );
}
