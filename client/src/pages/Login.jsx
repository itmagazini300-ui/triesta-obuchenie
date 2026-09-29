import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(user, password); nav('/'); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function fill(value) { setUser(value); setPassword('triesta123'); }

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div>
          <div className="brand" style={{ marginBottom: 30 }}>
            <span className="n300 ac" style={{ fontSize: 30 }}>300</span>
            <span className="nm" style={{ fontSize: 15 }}>ТРИСТА<small style={{ fontSize: 9 }}>ВЕРИГА СУПЕРМАРКЕТИ</small></span>
          </div>
          <div className="big">Академия<br /><span className="ac">300</span></div>
          <p className="lead">Структурирано обучение по модули, нива и сертификати — ясен път за развитие на всеки служител.</p>
          <div className="login-feats">
            <div className="lf"><div className="ic"><Icon name="grad" size={21} /></div>Учи в свое темпо, стъпка по стъпка</div>
            <div className="lf"><div className="ic"><Icon name="checkc" size={21} /></div>Тест и сертификат след всяка категория</div>
            <div className="lf"><div className="ic"><Icon name="trend" size={21} /></div>Проследяване на прогреса в реално време</div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <h2>Вход</h2>
          <p className="muted" style={{ marginTop: 6 }}>Служителите влизат с телефона си, управителите – с имейл.</p>
          <label>Телефон или имейл</label>
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="0888 123 456 или ime@triesta.bg" autoComplete="username" required />
          <label>Парола</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          {err && <div className="err">{err}</div>}
          <button className="btn block" style={{ marginTop: 20 }} disabled={busy}>
            {busy ? 'Влизане…' : 'Влез в системата'}
          </button>

          <div className="demo-hint">
            <b>Демо профили</b> (парола: <b>triesta123</b>)<br />
            Служител: <button type="button" onClick={() => fill('0888 200 001')}>0888 200 001</button><br />
            Управител: <button type="button" onClick={() => fill('mariya@triesta.bg')}>mariya@triesta.bg</button>
          </div>
        </form>
      </div>
    </div>
  );
}
