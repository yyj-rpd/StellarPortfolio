import type { Page, Route } from '@playwright/test';
import { profile, skills, projects, posts } from '../../src/data/mockContent';
import type { AdminTable } from '../../src/types/database';

// 测试专用 HTTP 替身。生产代码不引用本模块，不代表真实 Supabase/RLS 验证。
const adminId = '11111111-1111-4111-8111-111111111111';
const normalId = '22222222-2222-4222-8222-222222222222';
const stamp = '2026-01-01T08:00:00Z';
export function seedRows(): Record<AdminTable, Record<string, unknown>[]> {
  const base = { created_at: stamp, updated_at: stamp, status: 'published' };
  return {
    profile: [{ ...base, id: 1, display_name: profile.displayName, headline: profile.headline, research_summary: profile.researchSummary, bio: profile.bio, research_interests: profile.researchInterests, education: profile.education, experiences: profile.experiences, email: profile.email, github_url: profile.githubUrl }],
    skills: skills.map(s => ({ ...base, id: s.id, name: s.name, category: s.category, description: s.description, sort_order: s.sortOrder })),
    projects: projects.map(p => ({ ...base, id: p.id, title: p.title, summary: p.summary, kind: p.kind, category_label: p.categoryLabel, role: p.role, result: p.result, details: p.details, tech_stack: p.techStack, cover_url: p.coverUrl, github_url: p.githubUrl, detail_url: p.detailUrl, sort_order: p.sortOrder })),
    publications: posts.map(p => {
      const sections = p.contentMarkdown.split(/^## .+\n\n/gm).filter(Boolean).map(text => text.trim());
      return { ...base, id: p.id, content_type: p.contentType, title: p.title, slug: p.slug, excerpt: p.excerpt, tags: p.tags, published_at: stamp,
        journal: p.publication?.journal ?? null, article_type: p.publication?.articleType ?? null, author_role: p.publication?.authorRole ?? null,
        publication_status: p.publication?.publicationStatus ?? null, publication_date: null, doi: null, publication_url: null,
        introduction: sections[0], research_background: sections[1], research_content: sections[2], personal_contribution: sections[3], content_markdown: null };
    }),
  };
}
function token(id: string) {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) + '.test-signature';
}
export async function installBackend(page: Page) {
  const rows = structuredClone(seedRows()); const adminToken = token(adminId); const normalToken = token(normalId);
  const control = { failWrites: false, zeroWrites: false, membershipFailure: false };
  const userFor = (id: string) => ({ id, aud: 'authenticated', role: 'authenticated', email: id === adminId ? 'admin@test.invalid' : 'ordinary@test.invalid', app_metadata: {}, user_metadata: {}, created_at: stamp });
  async function fulfill(route: Route, value: unknown, status = 200, extra: Record<string, string> = {}) {
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Range', ...extra }, body: status === 204 ? undefined : JSON.stringify(value) });
  }
  await page.route('https://stellar-e2e.test/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const auth = request.headers().authorization ?? '';
    const id = auth.includes(adminToken) ? adminId : auth.includes(normalToken) ? normalId : null;
    if (request.method() === 'OPTIONS') return fulfill(route, {}, 200, { 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
    if (url.pathname.endsWith('/token')) {
      const body = request.postDataJSON() as { email: string; password: string };
      const uid = body.email.startsWith('ordinary') ? normalId : adminId;
      return fulfill(route, { access_token: uid === adminId ? adminToken : normalToken, refresh_token: 'test-only-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: userFor(uid) });
    }
    if (url.pathname.endsWith('/user')) return id ? fulfill(route, userFor(id)) : fulfill(route, { message: 'not authenticated' }, 401);
    if (url.pathname.endsWith('/logout')) return fulfill(route, {}, 204);
    const table = url.pathname.split('/').pop();
    if (table === 'admin_users') {
      if (control.membershipFailure) return fulfill(route, { code: '42501', message: 'test permission failure' }, 403);
      return fulfill(route, id === adminId ? [{ user_id: adminId }] : []);
    }
    if (!table || !Object.hasOwn(rows, table)) return fulfill(route, { message: 'missing test endpoint' }, 404);
    const name = table as AdminTable;
    const matching = () => rows[name].filter(row => {
      if (row.status !== 'published' && id !== adminId) return false;
      for (const [field, condition] of url.searchParams) {
        if (condition.startsWith('eq.') && String(row[field]) !== condition.slice(3)) return false;
      }
      return true;
    });
    let result = matching();

    const method = request.method();
    if (method !== 'GET') {
      if (id !== adminId) return fulfill(route, { code: '42501', message: 'not admin' }, 403);
      if (control.failWrites) return fulfill(route, { message: 'test failure' }, 503);
      if (control.zeroWrites) return fulfill(route, { code: 'PGRST116', message: 'zero rows' }, 406);
      const now = new Date().toISOString();
      if (method === 'POST') {
        const payload = request.postDataJSON() as Record<string, unknown>;
        const row = { ...payload, id: payload.id ?? crypto.randomUUID(), created_at: now, updated_at: now,
          ...(name === 'publications' ? { published_at: payload.status === 'published' ? now : null } : {}) };
        rows[name].push(row); result = [row];
      } else if (method === 'PATCH') {
        const payload = request.postDataJSON() as Record<string, unknown>;
        result.forEach(row => Object.assign(row, payload, { updated_at: now }));
      } else if (method === 'DELETE') {
        rows[name] = rows[name].filter(row => !result.includes(row));
      }
    }
    const total = result.length;
    if (method === 'GET') {
      const start = Number(url.searchParams.get('offset') ?? 0);
      result = result.slice(start, start + Number(url.searchParams.get('limit') ?? 100));
    }
    const single = request.headers().accept?.includes('application/vnd.pgrst.object+json');
    if (single && result.length !== 1) return fulfill(route, { code: 'PGRST116', message: 'zero rows' }, 406);
    return fulfill(route, single ? result[0] : result, 200, { 'content-range': '0-' + Math.max(0, result.length - 1) + '/' + total });
  });
  // 测试不允许未拦截的 Supabase 请求落到真实项目。
  return { control, rows };
}



