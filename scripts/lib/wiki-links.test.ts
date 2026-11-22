import { describe, expect, it } from 'vitest';
import { extractMarkdownDocLinks, extractWikiLinks, stripCode } from './wiki-links.ts';

describe('extractWikiLinks', () => {
  it('解析基础双链、别名与标题锚点', () => {
    const links = extractWikiLinks('看 [[渲染管线]]，再看 [[WebGL|图形接口]] 与 [[笔记#第三节|第三节]]。');
    expect(links).toEqual([
      { target: '渲染管线', alias: undefined },
      { target: 'WebGL', alias: '图形接口' },
      { target: '笔记', alias: '第三节' },
    ]);
  });

  it('重复引用会被保留（用于累加边权）', () => {
    expect(extractWikiLinks('[[A]] 和 [[A]]').map((link) => link.target)).toEqual(['A', 'A']);
  });

  it('忽略外链与嵌入语法之外的噪音', () => {
    expect(extractWikiLinks('[[https://example.com]]')).toEqual([]);
    expect(extractWikiLinks('[[]]')).toEqual([]);
  });

  it('代码块与行内代码里的双链不算引用', () => {
    const source = ['```', '[[A]]', '```', '行内 `[[B]]` 也不算', '但 [[C]] 算'].join('\n');
    expect(extractWikiLinks(source).map((link) => link.target)).toEqual(['C']);
  });
});

describe('extractMarkdownDocLinks', () => {
  it('只保留本地 .md 链接并去掉锚点', () => {
    const source = '[本地](./渲染/WebGL.md#性能) [外链](https://example.com/a.md) [图片](./a.png)';
    expect(extractMarkdownDocLinks(source)).toEqual(['./渲染/WebGL.md']);
  });

  it('忽略代码块中的示例', () => {
    expect(extractMarkdownDocLinks('```md\n[a](b.md)\n```')).toEqual([]);
  });
});

describe('stripCode', () => {
  it('删除围栏代码块与行内代码', () => {
    expect(stripCode('a `b` c\n```\nd\n```\ne')).toBe('a  c\n\ne');
  });
});
