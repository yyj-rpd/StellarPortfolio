import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
export type AuthState = { status: 'loading' | 'anonymous' | 'admin' | 'forbidden' | 'error'; user: User | null; message: string };
export type AuthContextValue = AuthState & { refresh: () => void; signOut: () => Promise<void> };
export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('认证上下文缺失。');
  return value;
}


