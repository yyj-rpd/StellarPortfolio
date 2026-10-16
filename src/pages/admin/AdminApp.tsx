import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, Link } from 'react-router';
import AuthProvider from '../../features/auth/AuthProvider';
import { useAuth } from '../../features/auth/context';
import { configurationError } from '../../lib/supabase';
import Login from './Login';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard';
import NotFound from '../public/NotFound';

const ResourcePage = lazy(() => import('./ResourcePage'));
function Gate() {
  const auth = useAuth();
  if (auth.status === 'loading') return <div className="state-panel" role="status">正在验证登录状态与管理员权限…</div>;
  if (auth.status === 'anonymous') return <Navigate to="/admin/login" replace />;
  if (auth.status !== 'admin') return <Login />;
  return <Outlet />;
}
export default function AdminApp() {
  const error = configurationError();
  if (error) return <div className="shell not-found" role="alert"><h1>尚未配置 Supabase</h1><p>{error}</p><Link className="button" to="/">返回网站</Link></div>;
  return <AuthProvider><Suspense fallback={<div className="state-panel">正在加载管理页面…</div>}><Routes>
    <Route path="login" element={<Login />} />
    <Route element={<Gate />}><Route element={<AdminLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="profile" element={<ResourcePage key="profile" table="profile" />} />
      <Route path="skills" element={<ResourcePage key="skills" table="skills" />} />
      <Route path="projects" element={<ResourcePage key="projects" table="projects" />} />
      <Route path="posts" element={<ResourcePage key="publications" table="publications" />} />
      <Route path="*" element={<NotFound />} />
    </Route></Route>
  </Routes></Suspense></AuthProvider>;
}


