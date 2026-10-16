import { getSupabase } from '../lib/supabase';
import { requestError } from '../lib/errors';
import type { PortfolioRepository } from '../types/content';
import { mapProfile, mapSkill, mapProject, mapPost, mapPostSummary } from './mapping';

export const summaryColumns = 'id,content_type,title,slug,excerpt,tags,status,published_at,created_at,updated_at,journal,article_type,author_role,publication_status,publication_date,doi,publication_url';
const timeout = () => AbortSignal.timeout(15000);
export const supabaseRepository: PortfolioRepository = {
  async getProfile() {
    const { data, error } = await getSupabase().from('profile').select('*').eq('id', 1).eq('status', 'published').abortSignal(timeout()).maybeSingle();
    if (error) throw requestError(error);
    return data ? mapProfile(data) : null;
  },
  async listSkills() {
    const { data, error } = await getSupabase().from('skills').select('*').eq('status', 'published')
      .order('sort_order').order('created_at').order('id').abortSignal(timeout());
    if (error) throw requestError(error);
    return (data ?? []).map(mapSkill);
  },
  async listProjects() {
    const { data, error } = await getSupabase().from('projects').select('*').eq('status', 'published')
      .order('sort_order').order('created_at').order('id').abortSignal(timeout());
    if (error) throw requestError(error);
    return (data ?? []).map(mapProject);
  },
  async listPosts(page = 1, pageSize = 10) {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || !Number.isSafeInteger(page * pageSize)) {
      throw new Error('无效分页参数。');
    }
    const { data, error, count } = await getSupabase().from('publications').select(summaryColumns, { count: 'exact' })
      .eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1).abortSignal(timeout());
    if (error) throw requestError(error);
    return { items: (data ?? []).map(mapPostSummary), total: count ?? 0, page, pageSize };
  },
  async getPost(slug) {
    const { data, error } = await getSupabase().from('publications').select('*')
      .eq('slug', slug).eq('status', 'published').abortSignal(timeout()).maybeSingle();
    if (error) throw requestError(error);
    return data ? mapPost(data) : null;
  },
};


