import type { ProfileInput, SkillInput, ProjectInput, PublicationInput, Status } from '../../types/database';
import type { EditorValues } from './forms';
import type { Education, Experience } from '../../types/content';

function string(value: string | undefined, label: string, max: number, required = true): string {
  const result = (value ?? '').trim();
  if ((required && !result) || result.length > max) throw new Error(label + '不能为空或超过长度限制。');
  return result;
}
function optional(value: string | undefined, label: string, max: number): string | null {
  return string(value, label, max, false) || null;
}
function list(value: string | undefined, label: string, count: number, length: number): string[] {
  const result = (value ?? '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (result.length > count || result.some(item => item.length > length)) throw new Error(label + '数量或单项长度超过限制。');
  return result;
}
function choice<T extends string>(value: string | undefined, allowed: readonly T[], label: string): T {
  const result = allowed.find(item => item === value);
  if (!result) throw new Error(label + '不合法。');
  return result;
}
function status(v: EditorValues): Status { return choice(v.fields.status, ['draft', 'published'], '网站发布状态'); }
function order(value: string | undefined): number {
  if (!/^\d+$/.test(value ?? '')) throw new Error('展示顺序须为非负整数。');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result > 2147483647) throw new Error('展示顺序超出范围。');
  return result;
}
function https(value: string | undefined, label: string, required = false, github = false): string | null {
  const result = optional(value, label, 2048);
  if (!result && !required) return null;
  if (!result || !/^https:\/\/[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?([/?#][^\s]*)?$/.test(result)) throw new Error(label + '须为有效 HTTPS 地址。');
  const url = new URL(result);
  if (url.username || url.password || (github && url.hostname !== 'github.com')) throw new Error(label + '地址不合法。');
  return result;
}
function month(value: string | null): string | null {
  if (!value) return null;
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('经历日期应为 YYYY-MM。');
  return value;
}
export function validHistory<T extends Education | Experience>(items: T[]): T[] {
  if (items.length > 20) throw new Error('教育或个人经历最多 20 项。');
  return items.map(item => {
    const start = month(item.start);
    const end = month(item.end);
    if (start && end && start > end) throw new Error('经历结束时间不能早于开始时间。');
    const description = string(item.description, '经历说明', 1000, false);
    if ('school' in item) {
      return { ...item, school: string(item.school, '学校', 160), degree: string(item.degree, '专业 / 学位', 160), start, end, description };
    }
    return { ...item, organization: string(item.organization, '机构', 160), role: string(item.role, '角色', 160), start, end, description };
  });
}
export function profileInput(v: EditorValues): ProfileInput {
  const f = v.fields;
  const email = optional(f.email, '公开邮箱', 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('邮箱格式不正确。');
  return { id: 1, display_name: string(f.display_name, '姓名', 80), headline: string(f.headline, '身份简介', 120),
    research_summary: string(f.research_summary, '首页研究简介', 200), bio: string(f.bio, '个人介绍', 4000),
    research_interests: list(f.research_interests, '研究兴趣', 30, 60), education: validHistory(v.education),
    experiences: validHistory(v.experiences), email, github_url: https(f.github_url, 'GitHub 主页', true, true)!, status: status(v) };
}
export function skillInput(v: EditorValues): SkillInput {
  const f = v.fields;
  return { name: string(f.name, '技能名称', 80), category: choice(f.category, ['language', 'tool', 'ml'], '技能分类'),
    description: string(f.description, '技能描述', 300, false), sort_order: order(f.sort_order), status: status(v) };
}
export function projectInput(v: EditorValues): ProjectInput {
  const f = v.fields;
  const cover = string(f.cover_url, '图片地址', 2048);
  if (!(cover.startsWith('/images/') && /^\/images\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(cover) && !cover.includes('..') && !cover.includes('//'))) https(cover, '图片地址', true);
  const details = list(f.details, '项目详情', 20, 1000);
  const github = https(f.github_url, 'GitHub 仓库', false, true);
  const detail = https(f.detail_url, '项目链接');
  if (!details.length && !github && !detail) throw new Error('请填写项目详情或真实项目链接。');
  return { title: string(f.title, '项目名称', 160), summary: string(f.summary, '项目简介', 1000),
    kind: choice(f.kind, ['development', 'research'], '作品类型'), category_label: string(f.category_label, '项目领域', 120),
    role: optional(f.role, '个人角色', 160), result: optional(f.result, '项目成果', 300), details,
    tech_stack: list(f.tech_stack, '技术栈', 30, 60), cover_url: cover, github_url: github, detail_url: detail,
    sort_order: order(f.sort_order), status: status(v) };
}
export function publicationInput(v: EditorValues): PublicationInput {

  const f = v.fields;
  const type = choice(f.content_type, ['post', 'publication'], '内容类型');
  const slug = string(f.slug, 'slug', 100);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('slug 只能包含小写英文、数字和分隔用单连字符。');
  const paper = type === 'publication';
  const date = paper ? optional(f.publication_date, '期刊出版日期', 10) : null;
  if (date && (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) || date.startsWith('0000') || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('期刊出版日期不正确。');
  const doi = paper ? optional(f.doi, 'DOI', 255) : null;
  if (doi && !/^10\.[0-9]{4,9}\/[^\s]+$/.test(doi)) throw new Error('DOI 格式不正确。');
  return { content_type: type, title: string(f.title, '标题', 300), slug, excerpt: string(f.excerpt, '摘要', 1000),
    tags: list(f.tags, '标签', 10, 60), status: status(v),
    journal: paper ? string(f.journal, '期刊', 160) : null,
    article_type: paper ? string(f.article_type, '文章类型', 120) : null,
    author_role: paper ? string(f.author_role, '个人角色', 160) : null,
    publication_status: paper ? string(f.publication_status, '期刊发表状态', 80) : null,
    publication_date: date, doi, publication_url: paper ? https(f.publication_url, '论文链接') : null,
    introduction: paper ? string(f.introduction, '论文简介', 10000) : null,
    research_background: paper ? string(f.research_background, '研究背景', 10000) : null,
    research_content: paper ? string(f.research_content, '主要研究内容', 30000) : null,
    personal_contribution: paper ? string(f.personal_contribution, '个人贡献', 10000) : null,
    content_markdown: paper ? null : string(f.content_markdown, '札记正文', 100000) };
}


