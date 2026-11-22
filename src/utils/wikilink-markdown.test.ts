import { describe, expect, it } from 'vitest';
import { parseOrbitHref, replaceWikiLinks } from './wikilink-markdown';

describe('replaceWikiLinks', () => {
  it('基础双链转为内部锚点链接', () => {
    expect(replaceWikiLinks('见 [[渲染管线]]。')).toBe('见 [渲染管线](#orbit=%E6%B8%B2%E6%9F%93%E7%AE%A1%E7%BA%BF)。');
  });

  it('别名与标题锚点只保留目标与别名', () => {
    const html = replaceWikiLinks('[[WebGL#性能|图形接口]]');
    expect(html).toContain('[图形接口](#orbit=WebGL)');
  });

  it('代码块与行内代码不转换', () => {
    const source = ['```', '[[A]]', '```', '行内 `[[B]]`', '正文 [[C]]'].join('\n');
    const result = replaceWikiLinks(source);
    expect(result).toContain('[[A]]');
    expect(result).toContain('[[B]]');
    expect(result).toContain('[C](#orbit=C)');
  });

  it('外链式双链保持原样', () => {
    expect(replaceWikiLinks('[[https://example.com]]')).toBe('[[https://example.com]]');
  });

  it('未提供别名时通过 titleResolver 替换为可读标题', () => {
    const resolver = (target: string) => (target === 'artifacts/standard-container' ? '标准集装箱' : undefined);
    expect(replaceWikiLinks('使用 [[artifacts/standard-container]] 运输', resolver)).toBe(
      '使用 [标准集装箱](#orbit=artifacts%2Fstandard-container) 运输',
    );
  });
});

describe('parseOrbitHref', () => {
  it('解出目标笔记', () => {
    expect(parseOrbitHref('#orbit=' + encodeURIComponent('语言/WebAssembly'))).toBe('语言/WebAssembly');
  });

  it('非内部链接返回 null', () => {
    expect(parseOrbitHref('https://example.com')).toBeNull();
    expect(parseOrbitHref('#section')).toBeNull();
  });
});
