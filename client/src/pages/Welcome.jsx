import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';

const STEPS = [
  { icon: 'users', t: 'Опознаване на компанията', d: 'Историята, ценностите и стандартите на Триста.' },
  { icon: 'grad', t: 'Запознанство с твоя ментор', d: 'Той ще ти помага с адаптацията и практическите задачи.' },
  { icon: 'book', t: 'Обучителни модули', d: 'Презентации, видеа, ръководства и тестове за проверка.' },
];
const FIRST_STEPS = [
  'Прегледай модул „Добре дошъл в Триста"',
  'Запознай се с основните стандарти',
  'Попълни личностния въпросник, за да опознаеш себе си',
  'Приготви въпросите си за първата среща с ментора',
];

export default function Welcome() {
  const { user, patchUser } = useAuth();
  const [closing, setClosing] = useState(false);

  async function dismiss() {
    setClosing(true);
    try { await api.welcomeSeen(); } catch { /* без значение */ }
    patchUser({ seen_welcome: 1 });
  }

  return (
    <div className="modal-back" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '30px 16px' }}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div style={{ background: 'var(--dark)', color: '#fff', padding: '26px 30px', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name="grad" size={26} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#c8beb7' }}>WELCOME MAIL</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Добре дошъл в Триста! 🎉</div>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '24px 30px 28px' }}>
          <p style={{ marginTop: 0, fontSize: 15.5, color: '#2c2926' }}>
            Здравей, <b>{user.name.split(' ')[0]}</b>! Радваме се, че избра да станеш част от екипа на Триста.
            Създадохме процеса така, че да се чувстваш уверен, подготвен и подкрепен още от първия работен ден.
          </p>

          <div className="eyebrow" style={{ margin: '18px 0 10px' }}>Какво предстои?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--tint)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name={s.icon} size={20} />
                </div>
                <div><b>{i + 1}. {s.t}</b><div className="muted" style={{ fontSize: 13.5 }}>{s.d}</div></div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, background: 'var(--tint-2)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="clip" size={18} /> Твоите първи стъпки
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FIRST_STEPS.map((f) => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
                  <span style={{ color: 'var(--green)' }}><Icon name="checkc" size={17} /></span>{f}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '22px 0 4px' }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--orange)' }}>Едно система. Един стандарт. Един силен екип.</div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>Не очакваме да знаеш всичко от първия ден. Всичко останало ще изградим заедно. 🚀</div>
          </div>

          <button className="btn block" style={{ marginTop: 16 }} disabled={closing} onClick={dismiss}>
            {closing ? 'Момент…' : 'Разбрах, да започваме!'}
          </button>
        </div>
      </div>
    </div>
  );
}
