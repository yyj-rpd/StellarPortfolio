import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export const configurationMessage = '请在 .env.local 填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY 后重启开发服务。';

export function validateConfiguration(url: unknown, key: unknown): { url: string; key: string } {
  if (typeof url !== 'string' || typeof key !== 'string' || !url.trim() || !key.trim()) {
    throw new Error(configurationMessage);
  }
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  let parsed: URL;
  try { parsed = new URL(cleanUrl); } catch { throw new Error('Supabase 项目地址格式不正确。'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Supabase 地址应为不含路径、账号或查询参数的 HTTPS 项目地址。');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(cleanKey)) {
    throw new Error('请使用 sb_publishable_ 开头的公开 key，不能使用 secret/service_role key。');
  }
  return { url: parsed.origin, key: cleanKey };
}

let client: SupabaseClient<Database> | undefined;
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const config = validateConfiguration(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    client = createClient<Database>(config.url, config.key, {
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }) },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export function configurationError(): string | null {
  try {
    validateConfiguration(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : configurationMessage;
  }
}


