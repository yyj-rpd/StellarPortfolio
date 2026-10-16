import type { PortfolioRepository, HomeContent } from '../types/content';
import { supabaseRepository } from './supabaseRepository';

// 生产读取只使用 Supabase；缺配置或请求失败不允许回退本地数据。
export const contentRepository: PortfolioRepository = supabaseRepository;
export async function getHomeContent(): Promise<HomeContent> {
  const [profile, skills, projects, posts] = await Promise.all([
    contentRepository.getProfile(), contentRepository.listSkills(),
    contentRepository.listProjects(), contentRepository.listPosts(1, 3),
  ]);
  return { profile, skills, projects, posts: posts.items };
}


