import { describe, expect, it } from 'vitest';
import { asStringList, deriveSummary, extractSummary, parseFrontmatter, toPlainText } from './frontmatter.ts';

describe('parseFrontmatter', () => {
  it('解析标量、行内数组与块数组', () => {
    const source = [
      '---',
      'title: 渲染管线',
      'status: active',
      'tags: [渲染, 性能]',
      'aliases:',
      '  - 管线',
      '  - 渲染链路',
      '---',
      '',
      '正文第一段。',
    ].join('\n');

    const { data, body } = parseFrontmatter(source);
    expect(data.title).toBe('渲染管线');
    expect(data.status).toBe('active');
    expect(data.tags).toEqual(['渲染', '性能']);
    expect(data.aliases).toEqual(['管线', '渲染链路']);
    expect(body).toBe('正文第一段。');
  });

  it('兼容 CRLF 与 BOM', () => {
    const source = '\uFEFF---\r\ntitle: 标题\r\n---\r\n正文\r\n';
    const { data, body } = parseFrontmatter(source);
    expect(data.title).toBe('标题');
    expect(body).toBe('正文\n');
  });

  it('没有 frontmatter 时原样返回', () => {
    const { data, body } = parseFrontmatter('# 标题\n\n内容');
    expect(data).toEqual({});
    expect(body).toBe('# 标题\n\n内容');
  });

  it('分隔符未闭合时不吞正文', () => {
    const source = '---\ntitle: 坏掉的\n\n正文';
    const { data, body } = parseFrontmatter(source);
    expect(data).toEqual({});
    expect(body).toBe(source);
  });

  it('去掉成对引号', () => {
    const { data } = parseFrontmatter('---\ntitle: "带引号: 的标题"\nsummary: \'单引号\'\n---\n');
    expect(data.title).toBe('带引号: 的标题');
    expect(data.summary).toBe('单引号');
  });

  it('忽略注释与空行', () => {
    const { data } = parseFrontmatter('---\n# 注释\n\ntitle: A\n---\n');
    expect(data).toEqual({ title: 'A' });
  });
});

describe('asStringList', () => {
  it('统一为数组', () => {
    expect(asStringList(undefined)).toEqual([]);
    expect(asStringList('a, b')).toEqual(['a', 'b']);
    expect(asStringList(['a ', ' b'])).toEqual(['a', 'b']);
  });
});

describe('toPlainText / extractSummary / deriveSummary', () => {
  it('剥掉 Markdown 噪音并保留双链文字', () => {
    const text = toPlainText('## 标题\n\n见 [[渲染管线|管线]] 与 [[WebAssembly]]。\n\n> 引用');
    expect(text).toBe('标题 见 管线 与 WebAssembly。 引用');
  });

  it('优先取正文首个有效段落', () => {
    const body = '\n\n# 大标题\n\n这是摘要段落，长度足够作为摘要。\n\n第二段。';
    expect(extractSummary(body)).toBe('这是摘要段落，长度足够作为摘要。');
  });

  it('超长时截断并加省略号', () => {
    const summary = extractSummary('很长的一段文字'.repeat(40), 20);
    expect(summary.endsWith('…')).toBe(true);
    expect(summary.length).toBe(21);
  });

  it('deriveSummary 跳过表格与列表并在标点断句', () => {
    const body = [
      '# 笔记标题',
      '| a | b |',
      '|---|---|',
      '- 列表',
      '第一段文字，这是用来测试自动推导摘要逻辑的完整长段落，其长度必须超过限制以便触发智能截断断句逻辑。',
    ].join('\n\n');
    const summary = deriveSummary(body, '笔记标题', 40, 20);
    expect(summary).toContain('第一段文字');
    expect(/([，。；]|…)$/.test(summary)).toBe(true);
    expect(deriveSummary('短文本')).toBe('短文本');
    expect(deriveSummary('')).toBe('');
  });
});
