import { Icon } from '../icons.jsx';

const STAGES = [
  {
    n: 1, title: 'Кандидатстване', sub: 'на кандидат служител', icon: 'clip',
    intro: 'Кандидатът може да достигне до интервю по един от следните начини:',
    items: ['Кандидатстване чрез обява или формуляр', 'Обаждане, инициирано от кандидата', 'Препоръка от служител или партньор'],
    foot: 'Следва интервю. Ако кандидатът е одобрен, преминава към следващия етап.',
  },
  {
    n: 2, title: 'Подготовка и начало', sub: 'на процеса', icon: 'monitor',
    intro: 'Стъпки преди първия работен ден:',
    items: ['Уговаряне на ден за подписване', 'DISC тест (онлайн или на хартия)', 'Определяне на ментор и магазин', 'Декларация и документи към ТРЗ', 'QR код с Welcome mail, видео и достъп до модулите'],
    foot: 'Кандидатът получава достъп до обучителната платформа.',
  },
  {
    n: 3, title: 'Практика', sub: 'на терен с ментор', icon: 'users',
    intro: 'Практическо обучение на терен със своя ментор:',
    items: ['Запознаване с екипа и работната среда', 'Обучение на процесите и стандартите', 'Постепенно поемане на отговорности', 'Обратна връзка и подкрепа от ментора'],
    foot: 'Знанието се проверява чрез модулите и тестовете в платформата.',
  },
];

export default function Onboarding() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Как започваме заедно</div>
        <h1>Път на новия служител</h1>
        <p>Ясен, поетапен процес от първия контакт до първия работен ден — за да се чувстваш уверен и подкрепен от самото начало.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', alignItems: 'stretch' }}>
        {STAGES.map((st) => (
          <div key={st.n} className="card" style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, flex: 'none' }}>{st.n}</div>
              <div>
                <h3 style={{ fontSize: 18, textTransform: 'uppercase' }}>{st.title}</h3>
                <div className="muted" style={{ fontSize: 13 }}>{st.sub}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--tint)' }}><Icon name={st.icon} size={30} /></div>
            </div>
            <div className="muted" style={{ fontSize: 14 }}>{st.intro}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {st.items.map((it) => (
                <div key={it} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--orange)', marginTop: 1 }}><Icon name="check" size={16} /></span>
                  <span style={{ fontSize: 14.5 }}>{it}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--tint-2)', borderRadius: 11, padding: '11px 14px', fontSize: 13.5, fontWeight: 600 }}>{st.foot}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20, padding: '20px 26px', background: 'var(--orange)', color: '#fff', border: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="spark" size={26} />
        <b style={{ fontSize: 20, textTransform: 'uppercase' }}>Ясен процес. Доверие от първия ден.</b>
      </div>
    </div>
  );
}
