import { installBackend } from './backend';
import { test, expect } from '@playwright/test';

const paperTitle = 'Artificial Intelligence-Enhanced Molecular Dynamics Simulations in Water Treatment';
const paperPath = '/blog/ai-enhanced-molecular-dynamics-water-treatment';

async function openMenuIfNeeded(page: import('@playwright/test').Page) {
  const menu = page.getByRole('button', { name: '菜单' });
  if (await menu.isVisible()) await menu.click();
}

test('真实个人资料、两项作品与论文详情可访问并可刷新', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.hero-intro')).toHaveText('你好，我是Yan Jia');
  await expect(page.locator('.timeline')).toContainText('大连海事大学');
  await expect(page.locator('.project-card')).toHaveCount(2);
  await expect(page.locator('.skill-row')).toHaveCount(14);
  await expect(page.locator('body')).not.toContainText('示例资料');
  await expect(page.locator('body')).not.toContainText('探索者');
  await expect(page.locator('body')).not.toContainText('ImageGrab');
  await page.getByRole('link', { name: '探索我的作品' }).click();
  await expect(page.locator('#projects')).toBeInViewport();
  await page.locator('.project-details summary').first().click();
  await expect(page.locator('.project-details').first()).toContainText('约 91%');
  await page.locator('.project-details summary').nth(1).click();
  await expect(page.locator('.project-details').nth(1)).toContainText('第一阶段判断船舶是否直靠');
  await openMenuIfNeeded(page);
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '研究札记' }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.locator('.post-row')).toHaveCount(1);
  await expect(page.locator('.post-row')).toContainText('Environmental Research');
  await expect(page.locator('.post-row')).toContainText('Review Article');
  await expect(page.locator('.post-row time')).toHaveCount(0);
  await page.getByRole('link', { name: paperTitle }).click();
  await expect(page).toHaveURL(paperPath);
  await expect(page.locator('.article-header h1')).toHaveText(paperTitle);
  await expect(page.locator('.article-header')).toContainText('独立第一作者');
  await expect(page.locator('.publication-notice')).toContainText('不提供论文全文');
  await expect(page.locator('.markdown h2')).toHaveText(['论文简介', '研究背景', '主要研究内容', '个人贡献']);
  await expect(page.locator('.article-header time')).toHaveCount(0);
  await expect(page.locator('.publication-doi')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('publication.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('.article-header h1')).toHaveText(paperTitle);
  await openMenuIfNeeded(page);
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '关于', exact: true }).click();
  await expect(page.locator('#about')).toBeInViewport();
  await page.goto('/blog/from-question-to-experiment');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('这片星域，尚未抵达。');
  expect(errors).toEqual([]);
});

test('响应式、封面回退与真实 GitHub 入口，未公开邮箱不生成链接', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('.contact-unavailable')).toContainText('暂未公开');
  await expect(page.locator('.contact-links a')).toHaveAttribute('href', 'https://github.com/yyj-rpd');
  await expect(page.locator('.contact-links a')).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.project-card a')).toHaveCount(0);
  for (const image of await page.locator('.project-card img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  const image = page.locator('.project-card img').first();
  await image.scrollIntoViewIfNeeded();
  await image.evaluate((img: HTMLImageElement) => { img.src = '/not-a-real-image.png'; });
  await expect(image).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});


test.beforeEach(async ({ page }) => { await installBackend(page); });
