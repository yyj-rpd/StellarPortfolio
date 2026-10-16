import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../../features/auth/context';
import { resourceNames, resourcePaths } from '../../features/admin/forms';

export default function AdminLayout() {
  const auth = useAuth();
  const [message, setMessage] = useState('');
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link className="brand" to="/admin">✳ stellar.</Link><p className="eyebrow">CONTENT STUDIO</p>
      <nav aria-label="后台导航"><NavLink to="/admin" end>内容概览</NavLink>{Object.entries(resourceNames).map(([table, name]) => <NavLink key={table} to={resourcePaths[table as keyof typeof resourcePaths]}>{name}</NavLink>)}</nav>
      <Link className="text-link" to="/">查看公开网站 ↗</Link>
    </aside>
    <div className="admin-main"><header className="admin-topbar"><span>内容管理</span><button className="button" onClick={() => { if (window.confirm('确定退出登录？未保存的修改将丢失。')) auth.signOut().catch(() => setMessage('退出失败，请检查网络后重试。')); }}>退出登录</button></header>
      {message && <p className="feedback error" role="alert">{message}</p>}
      <Outlet />
    </div>
  </div>;
}

