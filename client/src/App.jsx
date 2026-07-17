import { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { Brand, Icon, initials, Loading } from './components.jsx';

import Login from './pages/Login.jsx';
import EmployeeHome from './pages/EmployeeHome.jsx';
import CategoryView from './pages/CategoryView.jsx';
import ModuleView from './pages/ModuleView.jsx';
import TestView from './pages/TestView.jsx';
import Certificates from './pages/Certificates.jsx';
import ManagerHome from './pages/ManagerHome.jsx';
import ManagerEmployee from './pages/ManagerEmployee.jsx';
import AdminCategories from './pages/AdminCategories.jsx';
import AdminCategory from './pages/AdminCategory.jsx';
import AdminModule from './pages/AdminModule.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import Mentors from './pages/Mentors.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.me().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const value = {
    user,
    async login(email, password) { const d = await api.login(email, password); setUser(d.user); return d.user; },
    async logout() { await api.logout(); setUser(null); },
  };

  if (!ready) return <Loading text="Зареждане на Академията…" />;

  return (
    <AuthCtx.Provider value={value}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Protected user={user} />}>
          <Route path="/" element={user?.role === 'manager' ? <Navigate to="/manager" replace /> : <EmployeeHome />} />
          <Route path="/category/:id" element={<CategoryView />} />
          <Route path="/module/:id" element={<ModuleView />} />
          <Route path="/module/:id/test" element={<TestView />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/manager" element={<ManagerHome />} />
          <Route path="/manager/employee/:id" element={<ManagerEmployee />} />
          <Route path="/mentors" element={<Mentors />} />
          <Route path="/admin" element={<AdminCategories />} />
          <Route path="/admin/category/:id" element={<AdminCategory />} />
          <Route path="/admin/module/:id" element={<AdminModule />} />
          <Route path="/people" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthCtx.Provider>
  );
}

function Protected({ user }) {
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isManager = user.role === 'manager';
  const [menuOpen, setMenuOpen] = useState(false);

  async function doLogout() { setMenuOpen(false); await logout(); nav('/login'); }

  return (
    <>
      <header className="topbar">
        <button className="burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Меню" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
        <NavLink to="/" onClick={() => setMenuOpen(false)}><Brand /></NavLink>
        <nav className={'navlinks' + (menuOpen ? ' open' : '')} onClick={() => setMenuOpen(false)}>
          {isManager ? (
            <>
              <NavLink to="/manager" className={({ isActive }) => isActive ? 'active' : ''}>Табло</NavLink>
              <NavLink to="/mentors" className={({ isActive }) => isActive ? 'active' : ''}>Ментори</NavLink>
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Съдържание</NavLink>
              <NavLink to="/people" className={({ isActive }) => isActive ? 'active' : ''}>Хора</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Моите обучения</NavLink>
              <NavLink to="/certificates" className={({ isActive }) => isActive ? 'active' : ''}>Сертификати</NavLink>
            </>
          )}
        </nav>
        <div className="spacer" />
        <div className="who">
          <div className="av">{initials(user.name)}</div>
          <div className="info"><b>{user.name}</b><span>{isManager ? 'Управител' : user.position}</span></div>
        </div>
        <button className="linkbtn" onClick={doLogout} title="Изход">
          <Icon name="logout" size={18} />
        </button>
      </header>
      <Outlet />
    </>
  );
}
