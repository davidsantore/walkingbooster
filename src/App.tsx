import { useState, useEffect } from 'react';
import RedeemPage from './pages/RedeemPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

type Route = 'redeem' | 'admin-login' | 'admin-dashboard';

function getInitialRoute(): Route {
  if (window.location.pathname.startsWith('/admin')) return 'admin-login';
  return 'redeem';
}

export default function App() {
  const [route, setRoute] = useState<Route>(getInitialRoute);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin_token');
    if (stored && window.location.pathname.startsWith('/admin')) {
      setAdminToken(stored);
      setRoute('admin-dashboard');
    }
  }, []);

  function handleLogin(token: string) {
    setAdminToken(token);
    setRoute('admin-dashboard');
    window.history.pushState({}, '', '/admin');
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    setRoute('admin-login');
  }

  if (route === 'admin-dashboard' && adminToken) {
    return <AdminDashboard token={adminToken} onLogout={handleLogout} />;
  }

  if (route === 'admin-login' || window.location.pathname.startsWith('/admin')) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <RedeemPage />;
}
