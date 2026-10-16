import type { Education, Experience, Profile, Project, Skill, Post, PostSummary } from '../types/content';
import type { AdminRow, AdminTable, ProfileRow, ProjectRow, SkillRow, PublicationRow } from '../types/database';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('数据库返回了无效内容。');
  return value as Record<string, unknown>;
}
function text(row: Record<string, unknown>, key: string): string {
  if (typeof row[key] !== 'string') throw new Error('数据库字段格式不匹配。');
  return row[key];
}
function nullable(row: Record<string, unknown>, key: string): string | null {
  if (row[key] === null) return null;
  return text(row, key);
}
function strings(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new Error('数据库数组格式不匹配。');
  return value as string[];
}
function choice<T extends string>(row: Record<string, unknown>, key: string, values: readonly T[]): T {
  const value = text(row, key);
  const result = values.find(item => item === value);
  if (result === undefined) throw new Error('数据库分类格式不匹配。');
  return result;
}
function timestamp(row: Record<string, unknown>) {
  return { created_at: text(row, 'created_at'), updated_at: text(row, 'updated_at'), status: choice(row, 'status', ['draft', 'published'] as const) };
}
function order(row: Record<string, unknown>) {
  if (!Number.isInteger(row.sort_order) || Number(row.sort_order) < 0) throw new Error('数据库排序格式不匹配。');
  return Number(row.sort_order);
}
function history(value: unknown, kind: 'education'): Education[];
function history(value: unknown, kind: 'experience'): Experience[];
function history(value: unknown, kind: 'education' | 'experience'): (Education | Experience)[] {
  if (!Array.isArray(value)) throw new Error('经历数据格式不匹配。');
  return value.map(item => {
    const row = record(item);
    const common = { start: nullable(row, 'start'), end: nullable(row, 'end'), description: text(row, 'description') };
    return kind === 'education'
      ? { ...common, school: text(row, 'school'), degree: text(row, 'degree') }
      : { ...common, organization: text(row, 'organization'), role: text(row, 'role') };
  });
}
export function profileRow(value: unknown): ProfileRow {
  const row = record(value);
  if (row.id !== 1) throw new Error('个人资料必须是单例。');
  return { ...timestamp(row), id: 1, display_name: text(row, 'display_name'), headline: text(row, 'headline'),
    research_summary: text(row, 'research_summary'), bio: text(row, 'bio'),
    research_interests: strings(row, 'research_interests'), education: history(row.education, 'education'),
    experiences: history(row.experiences, 'experience'), email: nullable(row, 'email'), github_url: text(row, 'github_url') };
}
export function skillRow(value: unknown): SkillRow {
  const row = record(value);
  return { ...timestamp(row), id: text(row, 'id'), name: text(row, 'name'),
    category: choice(row, 'category', ['language', 'tool', 'ml'] as const),
    description: text(row, 'description'), sort_order: order(row) };
}
export function projectRow(value: unknown): ProjectRow {
  const row = record(value);
  return { ...timestamp(row), id: text(row, 'id'), title: text(row, 'title'), summary: text(row, 'summary'),
    kind: choice(row, 'kind', ['development', 'research'] as const), category_label: text(row, 'category_label'),
    role: nullable(row, 'role'), result: nullable(row, 'result'), details: strings(row, 'details'),
    tech_stack: strings(row, 'tech_stack'), cover_url: text(row, 'cover_url'),
    github_url: nullable(row, 'github_url'), detail_url: nullable(row, 'detail_url'), sort_order: order(row) };
}
export function publicationRow(value: unknown): PublicationRow {
  const row = record(value);
  return { ...timestamp(row), id: text(row, 'id'), content_type: choice(row, 'content_type', ['post', 'publication'] as const),
    title: text(row, 'title'), slug: text(row, 'slug'), excerpt: text(row, 'excerpt'), tags: strings(row, 'tags'),
    published_at: nullable(row, 'published_at'), journal: nullable(row, 'journal'), article_type: nullable(row, 'article_type'),
    author_role: nullable(row, 'author_role'), publication_status: nullable(row, 'publication_status'),
    publication_date: nullable(row, 'publication_date'), doi: nullable(row, 'doi'), publication_url: nullable(row, 'publication_url'),
    introduction: nullable(row, 'introduction'), research_background: nullable(row, 'research_background'),
    research_content: nullable(row, 'research_content'), personal_contribution: nullable(row, 'personal_contribution'),
    content_markdown: nullable(row, 'content_markdown') };
}
export function mapProfile(value: unknown): Profile {
  const r = profileRow(value);
  return { id: 1, displayName: r.display_name, headline: r.headline, researchSummary: r.research_summary, bio: r.bio,

    researchInterests: r.research_interests, education: r.education, experiences: r.experiences,
    email: r.email, githubUrl: r.github_url, status: r.status };
}
export function mapSkill(value: unknown): Skill {
  const r = skillRow(value);
  return { id: r.id, name: r.name, category: r.category, description: r.description, sortOrder: r.sort_order,
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}
export function mapProject(value: unknown): Project {
  const r = projectRow(value);
  return { id: r.id, title: r.title, summary: r.summary, kind: r.kind, categoryLabel: r.category_label, role: r.role,
    result: r.result, details: r.details, techStack: r.tech_stack, coverUrl: r.cover_url, githubUrl: r.github_url,
    detailUrl: r.detail_url, sortOrder: r.sort_order, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}
export function mapPostSummary(value: unknown): PostSummary {
  const r = record(value);
  const type = choice(r, 'content_type', ['post', 'publication'] as const);
  return { id: text(r, 'id'), contentType: type, title: text(r, 'title'), slug: text(r, 'slug'), excerpt: text(r, 'excerpt'),
    tags: strings(r, 'tags'), status: timestamp(r).status, createdAt: text(r, 'created_at'), updatedAt: text(r, 'updated_at'),
    publishedAt: nullable(r, 'published_at'), publication: type === 'publication' ? {
      journal: text(r, 'journal'), articleType: text(r, 'article_type'), authorRole: text(r, 'author_role'),
      publicationStatus: text(r, 'publication_status'), publicationDate: nullable(r, 'publication_date'),
      doi: nullable(r, 'doi'), url: nullable(r, 'publication_url'),
    } : null };
}
export function publicationMarkdown(row: PublicationRow): string {
  return row.content_type === 'post' ? row.content_markdown ?? '' : [
    '## 论文简介', row.introduction, '## 研究背景', row.research_background,
    '## 主要研究内容', row.research_content, '## 个人贡献', row.personal_contribution,
  ].join('\n\n');
}
export function mapPost(value: unknown): Post {
  const row = publicationRow(value);
  return { ...mapPostSummary(row), contentMarkdown: publicationMarkdown(row) };
}
export function parseAdminRow(table: AdminTable, value: unknown): AdminRow {
  switch (table) {
    case 'profile': return profileRow(value);
    case 'skills': return skillRow(value);
    case 'projects': return projectRow(value);
    case 'publications': return publicationRow(value);
  }
}


