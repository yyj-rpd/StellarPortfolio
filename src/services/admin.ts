import { getSupabase } from '../lib/supabase';
import { requestError } from '../lib/errors';
import type { AdminTable, AdminRow } from '../types/database';
import { parseAdminRow } from './mapping';
import { profileInput, skillInput, projectInput, publicationInput } from '../features/admin/validation';
import type { EditorValues } from '../features/admin/forms';

export async function requireAdmin(): Promise<string> {
  const client = getSupabase();
  const { data: user, error } = await client.auth.getUser();
  if (error || !user.user) throw new Error('会话已失效，请重新登录。当前输入尚未保存。');
  const { data, error: membershipError } = await client.from('admin_users').select('user_id')
    .eq('user_id', user.user.id).abortSignal(AbortSignal.timeout(15000)).maybeSingle();
  if (membershipError) throw requestError(membershipError);
  if (!data) throw new Error('当前账号没有管理员权限，不能保存内容。');
  return user.user.id;
}

export async function listAdminRows(table: AdminTable, page = 1) {
  await requireAdmin();
  let query = getSupabase().from(table).select('*', { count: 'exact' });
  if (table === 'skills' || table === 'projects') query = query.order('sort_order');
  query = query.order('created_at', { ascending: false }).order('id');
  const { data, error, count } = await query.range((page - 1) * 20, page * 20 - 1).abortSignal(AbortSignal.timeout(15000));
  if (error) throw requestError(error);
  return { rows: (data ?? []).map(row => parseAdminRow(table, row)), total: count ?? 0 };
}

function resultRow(table: AdminTable, result: { data: unknown; error: unknown }): AdminRow {
  if (result.error) throw requestError(result.error);
  if (!result.data) throw new Error('数据库未返回保存结果，请重新加载核对。');
  return parseAdminRow(table, result.data);
}

export async function saveAdminRow(table: AdminTable, values: EditorValues, original: AdminRow | null): Promise<AdminRow> {
  const client = getSupabase();
  // 构造已校验 payload，不提交 id 变更、created_at、updated_at 或 published_at。
  switch (table) {
    case 'profile': {
      const payload = profileInput(values);
      await requireAdmin();
      const result = original
        ? await client.from('profile').update(payload).eq('id', 1).eq('updated_at', original.updated_at).select('*').single()
        : await client.from('profile').insert(payload).select('*').single();
      return resultRow(table, result);
    }
    case 'skills': {
      const payload = skillInput(values);
      await requireAdmin();
      const result = original
        ? await client.from('skills').update(payload).eq('id', String(original.id)).eq('updated_at', original.updated_at).select('*').single()
        : await client.from('skills').insert(payload).select('*').single();
      return resultRow(table, result);
    }
    case 'projects': {
      const payload = projectInput(values);
      await requireAdmin();
      const result = original
        ? await client.from('projects').update(payload).eq('id', String(original.id)).eq('updated_at', original.updated_at).select('*').single()
        : await client.from('projects').insert(payload).select('*').single();
      return resultRow(table, result);
    }
    case 'publications': {
      const payload = publicationInput(values);
      await requireAdmin();
      const result = original
        ? await client.from('publications').update(payload).eq('id', String(original.id)).eq('updated_at', original.updated_at).select('*').single()
        : await client.from('publications').insert(payload).select('*').single();
      return resultRow(table, result);
    }
  }
}

export async function deleteAdminRow(table: Exclude<AdminTable, 'profile'>, row: AdminRow) {
  await requireAdmin();
  const { data, error } = await getSupabase().from(table).delete().eq('id', String(row.id))
    .eq('updated_at', row.updated_at).select('id').abortSignal(AbortSignal.timeout(15000));
  if (error) throw requestError(error);
  if (!data || data.length !== 1) throw new Error('记录已变化、已删除或没有权限，请重新加载核对。');
}


