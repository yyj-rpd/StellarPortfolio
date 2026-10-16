import { profile, skills, projects, posts } from '../data/mockContent';
import type { ContentRecord, PortfolioRepository, Post } from '../types/content';

const copy = <T,>(value: T): T => structuredClone(value);
const ordered = <T extends ContentRecord & { sortOrder: number }>(items: T[]) =>
  items.filter(item => item.status === 'published').sort((a, b) =>
    a.sortOrder - b.sortOrder ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
    a.id.localeCompare(b.id),
  );

// status 决定网站可见性，论文是否已发表及期刊出版日期是独立元信息。
// 该本地过滤不是权限边界；接入 Supabase 后仍必须使用 RLS。
export function createLocalRepository(source: {
  profile: typeof profile;
  skills: typeof skills;
  projects: typeof projects;
  posts: Post[];
}): PortfolioRepository {
  return {
    async getProfile() {
      return source.profile.status === 'published' ? copy(source.profile) : null;
    },
    async listSkills() { return copy(ordered(source.skills)); },
    async listProjects() { return copy(ordered(source.projects)); },
    async listPosts(page = 1, pageSize = 10) {
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new Error('无效分页参数');
      }
      const published = source.posts.filter(post => post.status === 'published').sort((a, b) =>
        (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.id.localeCompare(a.id),
      );
      const items = published.slice((page - 1) * pageSize, page * pageSize).map(post => {
        const { contentMarkdown, ...summary } = post;
        void contentMarkdown;
        return summary;
      });
      return copy({ items, total: published.length, page, pageSize });
    },
    async getPost(slug) {
      return copy(source.posts.find(post => post.slug === slug && post.status === 'published') ?? null);
    },
  };
}

export const mockRepository = createLocalRepository({ profile, skills, projects, posts });

