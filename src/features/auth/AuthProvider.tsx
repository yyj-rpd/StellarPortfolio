import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContext, type AuthState } from './context';
import { getSupabase } from '../../lib/supabase';
import { requestError } from '../../lib/errors';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, message: '' });
  const refresh = useCallback(() => {
    getSupabase().auth.getSession().then(({ data, error }) => {
      if (error) setState({ status: 'error', user: null, message: '无法恢复会话，请重试或重新登录。' });
      else setSession(data.session ? { ...data.session } : null);
    }).catch(() => setState({ status: 'error', user: null, message: '无法恢复会话，请检查网络。' }));
  }, []);
  useEffect(() => {
    let active = true;
    let eventReceived = false;
    const client = getSupabase();
    // 回调只同步更新状态，不在 Auth 锁内部执行白名单请求。
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      eventReceived = true;
      if (active) setSession(next ? { ...next } : null);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return;
      if (error) setState({ status: 'error', user: null, message: '无法恢复会话，请重试。' });
      else setSession(data.session);
    }).catch(() => { if (active) setState({ status: 'error', user: null, message: '无法恢复会话，请检查网络。' }); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active || session === undefined) return;
      if (!session) {
        setState({ status: 'anonymous', user: null, message: '' });
        return;
      }
      setState(previous => previous.status === 'admin' && previous.user?.id === session.user.id ? previous : { status: 'loading', user: null, message: '' });
      const client = getSupabase();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) {
        if (active) setState({ status: 'anonymous', user: null, message: '会话已失效，请重新登录。' });
        return;
      }
      const membership = await client.from('admin_users').select('user_id').eq('user_id', data.user.id)
        .abortSignal(AbortSignal.timeout(15000)).maybeSingle();
      if (membership.error) throw requestError(membership.error);
      if (active) setState({ status: membership.data ? 'admin' : 'forbidden', user: data.user, message: membership.data ? '' : '当前账号没有管理员权限。' });
    }).catch(() => { if (active) setState({ status: 'error', user: null, message: '无法验证管理员权限，请检查网络或稍后重试。' }); });
    return () => { active = false; };
  }, [session]);
  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) throw new Error('退出失败，请检查网络后重试。');
    setSession(null);
  }, []);
  return <AuthContext.Provider value={{ ...state, refresh, signOut }}>{children}</AuthContext.Provider>;
}

