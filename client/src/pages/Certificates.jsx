import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon } from '../icons.jsx';
import { Loading } from '../components.jsx';

export default function Certificates() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { api.certificates().then(setData); }, []);
  if (!data) return <Loading />;

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Сертификати</div>
        <h1>Моите постижения</h1>
        <p>Сертификат се издава автоматично при завършена категория — всички модули в нея, преминати с успех.</p>
      </div>

      {data.certificates.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--orange)', marginBottom: 10 }}><Icon name="medal" size={44} /></div>
          <h3 style={{ fontSize: 20 }}>Още нямаш сертификати</h3>
          <p className="muted" style={{ marginTop: 6 }}>Завърши всички модули в дадена категория, за да получиш първия си сертификат.</p>
          <Link to="/" className="btn" style={{ marginTop: 16 }}>Към обученията</Link>
        </div>
      ) : (
        <div className="catlist">
          {data.certificates.map((c) => (
            <div key={c.slug} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="ic" style={{ width: 52, height: 52, borderRadius: 13, background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name="medal" size={28} />
                </div>
                <div>
                  <div className="eyebrow" style={{ fontSize: 11 }}>Сертификат „Триста"</div>
                  <h3 style={{ fontSize: 18 }}>{c.category}</h3>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
                <span>{c.moduleCount} завършени модула</span>
                <span>{user.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
