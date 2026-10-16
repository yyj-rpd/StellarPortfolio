import { test, expect, type Page } from '@playwright/test';
import { installBackend } from './backend';
async function login(page: Page, ordinary = false) {
  await page.goto('/admin/login');
  await page.getByLabel('登录邮箱').fill(ordinary ? 'ordinary@test.invalid' : 'admin@test.invalid');
  await page.getByLabel('密码', { exact: true }).fill('test-only-not-a-real-password');
  await page.getByRole('button', { name: '登录管理后台' }).click();
}
test('后台拒绝匿名与普通登录账号，允许退出', async ({ page }) => {
  await installBackend(page);
  await page.goto('/admin/projects');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('button', { name: /注册/ })).toHaveCount(0);
  await login(page, true);
  await expect(page.getByRole('alert')).toContainText('没有管理员权限');
  await expect(page.getByRole('navigation', { name: '后台导航' })).toHaveCount(0);
  await page.getByRole('button', { name: '退出当前会话' }).click();
  await expect(page.getByRole('button', { name: '登录管理后台' })).toBeVisible();
});
test('管理员恢复会话、保存四类内容、发布后前台读取、技能增删', async ({ page }, testInfo) => {
  await installBackend(page);
  page.on('dialog', dialog => dialog.accept());
  await login(page);
  await expect(page.getByRole('heading', { name: '让内容持续生长。' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: '后台导航' });
  await nav.getByRole('link', { name: '个人资料' }).click(); await expect(page.locator('.resource-page h1')).toHaveText('个人资料');
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('姓名').fill('Yan Jia Updated');
  await page.getByRole('button', { name: '保存并更新线上' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  await nav.getByRole('link', { name: '技术技能' }).click(); await expect(page.locator('.resource-page h1')).toHaveText('技术技能');
  await page.getByRole('button', { name: '新增技术技能' }).click();
  await page.getByLabel('技能名称').fill('Test Tool');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  const card = page.locator('.record-card').filter({ hasText: 'Test Tool' });
  await expect(card).toContainText('草稿');
  await card.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('删除成功。');
  await expect(card).toHaveCount(0);
  await nav.getByRole('link', { name: '项目作品' }).click(); await expect(page.locator('.resource-page h1')).toHaveText('项目作品');
  await page.locator('.record-card').first().getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('项目简介').fill('Updated project summary');
  await page.getByRole('button', { name: '保存并更新线上' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  await nav.getByRole('link', { name: '论文与研究札记' }).click(); await expect(page.locator('.resource-page h1')).toHaveText('论文与研究札记');
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('个人贡献').fill('Updated contribution');
  await page.getByRole('button', { name: '预览正文' }).click();
  await expect(page.locator('.admin-preview')).toContainText('Updated contribution');
  await page.getByRole('button', { name: '保存并更新线上' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('admin.png'), fullPage: true });
  await page.getByRole('link', { name: '查看公开网站' }).click();
  await expect(page.locator('.hero-intro')).toContainText('Yan Jia Updated');
  await expect(page.locator('.project-card').first()).toContainText('Updated project summary');
  await page.goto('/blog/ai-enhanced-molecular-dynamics-water-treatment');
  await expect(page.locator('.markdown')).toContainText('Updated contribution');
  await page.goto('/admin');
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
test('保存失败或零行返回保留输入，未保存离开有确认', async ({ page }) => {
  const backend = await installBackend(page);
  await login(page);
  await page.getByRole('navigation', { name: '后台导航' }).getByRole('link', { name: '技术技能' }).click();
  await page.locator('.record-card').first().getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('技能描述').fill('Keep my input');
  backend.control.failWrites = true;
  await page.getByRole('button', { name: '保存并更新线上' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('技能描述')).toHaveValue('Keep my input');
  backend.control.failWrites = false; backend.control.zeroWrites = true;
  await page.getByRole('button', { name: '保存并更新线上' }).click();
  await expect(page.getByRole('alert')).toContainText('记录已变化');
  await expect(page.getByLabel('技能描述')).toHaveValue('Keep my input');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('navigation', { name: '后台导航' }).getByRole('link', { name: '项目作品' }).click();
  await expect(page).toHaveURL(/\/admin\/skills$/);
});



test('新增札记：草稿不可公开，发布可读，撤回和删除生效', async ({ page }) => {
  await installBackend(page);
  page.on('dialog', dialog => dialog.accept());
  await login(page);
  const goPosts = async () => {
    await page.goto('/admin/posts');
    await expect(page.getByRole('button', { name: '新增论文与研究札记' })).toBeVisible();
  };
  await goPosts();
  await page.getByRole('button', { name: '新增论文与研究札记' }).click();
  await page.getByLabel('标题', { exact: false }).fill('Local test note');
  await page.getByLabel('详情页标识 slug').fill('local-test-note');
  await page.getByLabel('摘要简介').fill('Local testing only');
  await page.getByLabel('札记正文').fill('## Test heading\n\nLocal test body');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  await page.goto('/blog/local-test-note');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('这片星域，尚未抵达。');
  await goPosts();
  await page.locator('.record-card').filter({ hasText: 'Local test note' }).getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('网站发布状态').selectOption('published');
  await page.getByRole('button', { name: '发布内容' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  await page.goto('/blog/local-test-note');
  await expect(page.locator('.markdown')).toContainText('Local test body');
  await goPosts();
  const card = page.locator('.record-card').filter({ hasText: 'Local test note' });
  await card.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('网站发布状态').selectOption('draft');
  await page.getByRole('button', { name: '保存并撤回' }).click();
  await expect(page.getByRole('status')).toContainText('保存成功');
  await page.goto('/blog/local-test-note');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('这片星域，尚未抵达。');
  await goPosts();
  await card.getByRole('button', { name: '删除', exact: true }).click();
  await expect(card).toHaveCount(0);
});
test('白名单查询失败时拒绝进入后台并提供重试', async ({ page }) => {
  const backend = await installBackend(page);
  backend.control.membershipFailure = true;
  await login(page);
  await expect(page.getByRole('alert')).toContainText('无法验证管理员权限');
  await expect(page.getByRole('navigation', { name: '后台导航' })).toHaveCount(0);
  backend.control.membershipFailure = false;
  await page.getByRole('button', { name: '重新验证' }).click();
  await expect(page.getByRole('heading', { name: '让内容持续生长。' })).toBeVisible();
});


