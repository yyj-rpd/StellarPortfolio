import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../../features/auth/context';
import { getSupabase } from '../../lib/supabase';

export default function Login() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setMessage('');
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: String(values.get('email') ?? '').trim(),
        password: String(values.get('password') ?? ''),
      });
      if (error) throw new Error('登录失败，请检查邮箱、密码或网络连接。');
      auth.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '登录失败，请稍后重试。'); }
    finally { const password = form.elements.namedItem('password'); if (password instanceof HTMLInputElement) password.value = ''; setBusy(false); }
  }
  if (auth.status === 'admin') return <Navigate to="/admin" replace />;
  if (auth.status === 'loading') return <div className="state-panel" role="status">正在验证登录状态与管理员权限…</div>;
  return <div className="admin-login"><Link className="back-link" to="/">← 返回网站</Link><p className="eyebrow">STELLAR / CONTENT STUDIO</p><h1>管理你的探索记录。</h1>
    {auth.status === 'forbidden' || auth.status === 'error' ? <>
      <p role="alert">{auth.message}</p><div className="admin-actions">
        {auth.status === 'error' && <button className="button" onClick={auth.refresh}>重新验证</button>}
        <button className="button" onClick={() => { auth.signOut().catch(() => setMessage('退出失败，请重试。')); }}>退出当前会话</button>
      </div>
    </> : <form onSubmit={login} className="admin-form">
      <label>登录邮箱<input name="email" type="email" autoComplete="username" required disabled={busy} /></label>
      <label>密码<input name="password" type="password" autoComplete="current-password" required disabled={busy} /></label>
      <button className="button button-primary" disabled={busy}>{busy ? '正在登录…' : '登录管理后台'}</button>
      <p className="field-hint">仅限已授权管理员；本网站不提供自助注册。</p>
    </form>}
    {message && <p className="feedback error" role="alert">{message}</p>}
  </div>;
}


