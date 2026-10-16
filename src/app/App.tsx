import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import Layout from '../components/layout/Layout';
import Home from '../pages/public/Home';
import NotFound from '../pages/public/NotFound';
const BlogList = lazy(() => import('../pages/public/BlogList'));
const BlogDetail = lazy(() => import('../pages/public/BlogDetail'));
const AdminApp = lazy(() => import('../pages/admin/AdminApp'));
export default function App() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/') document.title = 'Stellar Portfolio · 探索与构建';
    else if (location.pathname.startsWith('/admin')) document.title = '内容管理 · Stellar Portfolio';
    else if (!location.pathname.startsWith('/blog')) document.title = '未找到页面 · Stellar Portfolio';
  }, [location.pathname]);
  return <Suspense fallback={<div className="state-panel" role="status">正在加载页面…</div>}><Routes>
    <Route path="admin/*" element={<AdminApp />} />
    <Route element={<Layout />}><Route index element={<Home />} /><Route path="blog" element={<BlogList />} />
      <Route path="blog/:slug" element={<BlogDetail />} /><Route path="*" element={<NotFound />} /></Route>
  </Routes></Suspense>;
}


