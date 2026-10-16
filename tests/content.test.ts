import { describe, it, expect } from 'vitest';
import { createLocalRepository, mockRepository } from '../src/services/mockRepository';
import { profile, skills, projects, posts } from '../src/data/mockContent';
import { safeUrl } from '../src/lib/format';
import type { Post } from '../src/types/content';

const publication = posts[0];
const article: Post = {
  ...publication,
  id: 'test-note',
  slug: 'test-note',
  title: '测试专用札记',
  contentType: 'post',
  publication: null,
  publishedAt: '2026-01-01T08:00:00Z',
};
const draft: Post = { ...article, id: 'test-draft', slug: 'test-draft', status: 'draft' };
// 测试内容仅存在于测试代码中，不作为网站内容发布。
const repository = createLocalRepository({ profile, skills, projects, posts: [publication, article, draft] });

describe('公开内容读取约定', () => {
  it('未知出版日期不会隐藏已发表论文，普通札记与草稿保持独立', async () => {
    const result = await repository.listPosts();
    expect(result.items).toHaveLength(2);
    expect(result.items.every(post => post.status === 'published')).toBe(true);
    expect(await repository.getPost('test-draft')).toBeNull();
    expect(await repository.getPost('missing')).toBeNull();
    const paper = await repository.getPost(publication.slug);
    expect(paper?.publication?.publicationStatus).toBe('已发表');
    expect(paper?.publication?.publicationDate).toBeNull();
    expect(paper?.publishedAt).toBeNull();
    expect((await repository.getPost(article.slug))?.contentType).toBe('post');
  });
  it('分页不重复、不附带正文，非法参数被拒绝', async () => {
    const first = await repository.listPosts(1, 1);
    const second = await repository.listPosts(2, 1);
    expect(first.items).toHaveLength(1);
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(first.items[0]).not.toHaveProperty('contentMarkdown');
    expect(first.total).toBe(2);
    await expect(repository.listPosts(0)).rejects.toThrow();
  });
  it('真实内容仅含两项作品和一篇论文，不填造邮箱、日期与论文链接', async () => {
    const person = await mockRepository.getProfile();
    expect(person?.displayName).toBe('Yan Jia');
    expect(person?.email).toBeNull();
    expect(person?.education[0].start).toBeNull();
    expect(await mockRepository.listProjects()).toHaveLength(2);
    expect((await mockRepository.listPosts()).total).toBe(1);
    expect(publication.publication?.doi).toBeNull();
    expect(publication.publication?.url).toBeNull();
  });
  it('调用方不能通过修改返回值破坏后续读取', async () => {
    const person = await mockRepository.getProfile();
    if (!person) throw new Error('资料缺失');
    person.displayName = 'changed';
    expect((await mockRepository.getProfile())?.displayName).toBe('Yan Jia');
  });
});
describe('Markdown URL 安全', () => {
  it('拒绝脚本、data URL、协议相对地址和非 HTTPS 图片', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '//evil.test']) expect(safeUrl(url)).toBeUndefined();
    expect(safeUrl('http://example.com/a.png', true)).toBeUndefined();
    expect(safeUrl('https://example.com/a.png', true)).toBe('https://example.com/a.png');
    expect(safeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });
});

