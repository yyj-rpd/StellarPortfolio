import type { Education, Experience } from '../../types/content';
import type { AdminTable, AdminRow } from '../../types/database';

export type Field = {
  key: string; label: string; type?: 'textarea' | 'select' | 'number' | 'date' | 'email';
  required?: boolean; max?: number; hint?: string; options?: { value: string; label: string }[];
  forType?: 'post' | 'publication';
};
export type EditorValues = { fields: Record<string, string>; education: Education[]; experiences: Experience[] };
const status: Field = { key: 'status', label: '网站发布状态', type: 'select', options: [{ value: 'draft', label: '草稿 · 仅管理员可见' }, { value: 'published', label: '已发布 · 对访客公开' }] };
export const resourceNames: Record<AdminTable, string> = { profile: '个人资料', skills: '技术技能', projects: '项目作品', publications: '论文与研究札记' };
export const resourcePaths: Record<AdminTable, string> = { profile: '/admin/profile', skills: '/admin/skills', projects: '/admin/projects', publications: '/admin/posts' };
export const fields: Record<AdminTable, Field[]> = {
  profile: [
    { key: 'display_name', label: '姓名', required: true, max: 80 },
    { key: 'headline', label: '身份简介', required: true, max: 120 },
    { key: 'research_summary', label: '首页研究方向简介', type: 'textarea', required: true, max: 200 },
    { key: 'bio', label: '个人介绍', type: 'textarea', required: true, max: 4000 },
    { key: 'research_interests', label: '研究兴趣', type: 'textarea', hint: '每行一项，最多 30 项，每项最多 60 字。' },
    { key: 'github_url', label: 'GitHub 主页', required: true, max: 2048 },
    { key: 'email', label: '公开联系邮箱', type: 'email', max: 254, hint: '可留空；与登录邮箱相互独立。' }, status,
  ],
  skills: [
    { key: 'name', label: '技能名称', required: true, max: 80 },
    { key: 'category', label: '技能分类', type: 'select', options: [{ value: 'language', label: '编程语言' }, { value: 'tool', label: '开发与工具' }, { value: 'ml', label: 'AI 与机器学习' }] },
    { key: 'description', label: '技能描述', type: 'textarea', max: 300 },
    { key: 'sort_order', label: '展示顺序', type: 'number', required: true, hint: '非负整数，较小的值先展示。' }, status,
  ],
  projects: [
    { key: 'title', label: '项目名称', required: true, max: 160 },
    { key: 'summary', label: '项目简介', type: 'textarea', required: true, max: 1000 },
    { key: 'kind', label: '作品类型', type: 'select', options: [{ value: 'development', label: '开发项目' }, { value: 'research', label: '科研作品' }] },
    { key: 'category_label', label: '项目领域', required: true, max: 120 },
    { key: 'role', label: '个人角色', max: 160 },
    { key: 'result', label: '已确认的项目成果', max: 300, hint: '未提供的指标请留空。' },
    { key: 'tech_stack', label: '技术栈', type: 'textarea', hint: '每行一项，最多 30 项，每项最多 60 字。' },
    { key: 'details', label: '项目详情', type: 'textarea', hint: '每行一段，最多 20 段，每段最多 1000 字。没有项目链接时至少填写一段。' },
    { key: 'cover_url', label: '图片地址', required: true, max: 2048, hint: 'HTTPS 图片地址或 /images/ 下已有资源。本版不提供图片上传。' },
    { key: 'github_url', label: 'GitHub 仓库链接', max: 2048 },
    { key: 'detail_url', label: '外部项目详情链接', max: 2048 },
    { key: 'sort_order', label: '展示顺序', type: 'number', required: true }, status,
  ],
  publications: [
    { key: 'content_type', label: '内容类型', type: 'select', options: [{ value: 'post', label: '研究札记' }, { value: 'publication', label: '学术论文介绍' }] },
    { key: 'title', label: '标题', required: true, max: 300 },
    { key: 'slug', label: '详情页标识 slug', required: true, max: 100, hint: '小写英文、数字与单连字符。修改已有 slug 会使旧链接失效。' },
    { key: 'excerpt', label: '摘要简介', type: 'textarea', required: true, max: 1000 },
    { key: 'tags', label: '标签', type: 'textarea', hint: '每行一项，最多 10 项，每项最多 60 字。' },
    { key: 'journal', label: '期刊', required: true, max: 160, forType: 'publication' },
    { key: 'article_type', label: '文章类型', required: true, max: 120, forType: 'publication' },
    { key: 'author_role', label: '个人角色', required: true, max: 160, forType: 'publication' },
    { key: 'publication_status', label: '期刊发表状态', required: true, max: 80, forType: 'publication', hint: '这是期刊状态，与下方网站发布状态不同。' },
    { key: 'publication_date', label: '期刊出版日期', type: 'date', forType: 'publication', hint: '未确认时留空，不要用网站发布时间代替。' },
    { key: 'doi', label: 'DOI', max: 255, forType: 'publication' },
    { key: 'publication_url', label: '论文链接', max: 2048, forType: 'publication' },
    { key: 'introduction', label: '论文简介', type: 'textarea', required: true, max: 10000, forType: 'publication' },
    { key: 'research_background', label: '研究背景', type: 'textarea', required: true, max: 10000, forType: 'publication' },
    { key: 'research_content', label: '主要研究内容', type: 'textarea', required: true, max: 30000, forType: 'publication' },
    { key: 'personal_contribution', label: '个人贡献', type: 'textarea', required: true, max: 10000, forType: 'publication' },
    { key: 'content_markdown', label: '札记正文（Markdown）', type: 'textarea', required: true, max: 100000, forType: 'post' }, status,
  ],
};
export function initialValues(table: AdminTable, row: AdminRow | null): EditorValues {
  const values: EditorValues = {

    fields: { status: 'draft', category: 'tool', sort_order: '0', kind: 'development', content_type: 'post' },
    education: [], experiences: [],
  };
  if (!row) return values;
  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value) && ['education', 'experiences'].includes(key)) continue;
    values.fields[key] = Array.isArray(value) ? value.join('\n') : value === null ? '' : String(value);
  }
  if (table === 'profile' && 'education' in row) {
    values.education = structuredClone(row.education);
    values.experiences = structuredClone(row.experiences);
  }
  return values;
}


