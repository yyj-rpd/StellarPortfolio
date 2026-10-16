import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import SafeMarkdown from '../src/components/portfolio/SafeMarkdown';
describe('真实 Markdown 渲染', () => {
  it('跳过原始脚本/HTML，不生成恶意链接与 data 图片', () => {
    const html = renderToStaticMarkup(createElement(SafeMarkdown,{content:'<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>\n\n[危险](javascript:alert%281%29)\n\n![bad](data:image/svg+xml,bad)'}));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href=');
  });
  it('正确渲染标题、代码与安全外链', () => {
    const html = renderToStaticMarkup(createElement(SafeMarkdown,{content:'## 标题\n\n~~~ts\nconst x = 1;\n~~~\n\n[文档](https://react.dev)'}));
    expect(html).toContain('<h2>标题</h2>');
    expect(html).toContain('<pre>');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

