import { describe, it, expect } from 'vitest';
import { mapProfile, mapProject, mapPost, mapPostSummary, profileRow, projectRow, publicationRow } from '../src/services/mapping';
import { initialValues } from '../src/features/admin/forms';
import { profileInput, projectInput, publicationInput } from '../src/features/admin/validation';
import { validateConfiguration } from '../src/lib/supabase';

const timestamps = { status: 'published', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const profile = { ...timestamps, id: 1, display_name: 'Test', headline: 'Student', research_summary: 'Research', bio: 'Bio', research_interests: ['ML'], education: [{ school: 'School', degree: 'CS', start: null, end: null, description: '' }], experiences: [], email: null, github_url: 'https://github.com/test' };
const paper = { ...timestamps, id: 'paper', content_type: 'publication', title: 'Paper', slug: 'paper', excerpt: 'Abstract', tags: ['ML'], published_at: timestamps.created_at, journal: 'Journal', article_type: 'Review', author_role: 'First author', publication_status: 'Published', publication_date: null, doi: null, publication_url: null, introduction: 'Intro', research_background: 'Background', research_content: 'Research', personal_contribution: 'Contribution', content_markdown: null };
describe('实际 schema 映射和写入约定', () => {
  it('映射 profile 的可空邮箱和 JSON 教育经历', () => {
    expect(mapProfile(profile).education[0].start).toBeNull();
    expect(mapProfile(profile).email).toBeNull();
    const input = profileInput(initialValues('profile', profileRow(profile)));
    expect(input).toMatchObject({ id: 1, display_name: 'Test', email: null });
    expect(input).not.toHaveProperty('created_at');
  });
  it('论文分节生成介绍，期刊日期不取网站时间', () => {
    const mapped = mapPost(paper);
    expect(mapped.contentMarkdown).toContain('## 个人贡献\n\nContribution');
    expect(mapped.publication?.publicationDate).toBeNull();
    expect(mapped.publishedAt).toBe(timestamps.created_at);
    expect(mapPostSummary(paper)).not.toHaveProperty('contentMarkdown');
    const values = initialValues('publications', publicationRow(paper));
    const payload = publicationInput(values);
    expect(payload.content_markdown).toBeNull();
    expect(payload.publication_date).toBeNull();
    expect(payload).not.toHaveProperty('published_at');
    values.fields.content_type = 'post'; values.fields.content_markdown = '# Note';
    const note = publicationInput(values);
    expect(note.journal).toBeNull();
    expect(note.research_content).toBeNull();
    expect(note.content_markdown).toBe('# Note');
  });
  it('项目数组及可空链接双向映射，无链接仍可通过详情展示', () => {
    const row = { ...timestamps, id: 'project', title: 'Project', summary: 'Summary', kind: 'development', category_label: 'ML', role: null, result: null, details: ['First', 'Second'], tech_stack: ['Python'], cover_url: '/images/butterfly.svg', github_url: null, detail_url: null, sort_order: 0 };
    expect(mapProject(row).details).toEqual(['First', 'Second']);
    const values = initialValues('projects', projectRow(row));
    expect(projectInput(values).details).toEqual(['First', 'Second']);
    values.fields.cover_url = 'javascript:alert(1)';
    expect(() => projectInput(values)).toThrow();
    expect(() => mapProfile({ ...profile, education: [{}] })).toThrow();
  });
});
describe('公开配置校验', () => {
  it('缺配置明确失败，高权限 key 被拒绝', () => {
    expect(() => validateConfiguration('', '')).toThrow('请在 .env.local');
    expect(() => validateConfiguration('https://project.test', 'sb_secret_test')).toThrow();
    expect(() => validateConfiguration('https://user:pass@project.test', 'sb_publishable_test')).toThrow();
    expect(validateConfiguration('https://project.test', 'sb_publishable_test').url).toBe('https://project.test');
  });
});


