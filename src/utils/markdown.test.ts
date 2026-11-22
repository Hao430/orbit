// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('渲染标题、列表与段落', () => {
    const html = renderMarkdown('## 小节\n\n- 一\n- 二');
    expect(html).toContain('<h2>小节</h2>');
    expect(html).toContain('<li>一</li>');
  });

  it('把双链渲染成内部锚点', () => {
    const html = renderMarkdown('见 [[渲染管线|管线]]');
    expect(html).toContain('href="#orbit=%E6%B8%B2%E6%9F%93%E7%AE%A1%E7%BA%BF"');
    expect(html).toContain('>管线</a>');
  });

  it('代码块里的双链保持原样', () => {
    const html = renderMarkdown('\u0060\u0060\u0060\n[[A]]\n\u0060\u0060\u0060');
    expect(html).toContain('[[A]]');
    expect(html).not.toContain('#orbit=A');
  });

  it('保留外部链接', () => {
    const html = renderMarkdown('[文档](https://example.com)');
    expect(html).toContain('href="https://example.com"');
  });

  it('原始 HTML 被转义，不会生成可执行标签', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('拒绝 javascript: 协议链接', () => {
    const html = renderMarkdown('[点我](javascript:alert(1))');
    expect(html).not.toContain('href="javascript:');
  });
});
