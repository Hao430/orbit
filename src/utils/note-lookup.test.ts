import { describe, expect, it } from 'vitest';
import type { CelestialNode } from '@/types/celestial';
import { createNoteLookup } from './note-lookup';

const makeNode = (id: string, title: string, aliases: string[] = []): CelestialNode => ({
  id,
  title,
  aliases,
  summary: '',
  clusterId: 'c0',
  role: 'main-sequence',
  degree: 0,
  betweenness: 0,
  backbone: false,
  notePath: 'wiki/' + id + '.md',
  x: 0,
  y: 0,
  metrics: { degree: 0, size: 12, haloAlpha: 0.15, mass: 2, isBridge: false },
});

describe('createNoteLookup', () => {
  const lookup = createNoteLookup([
    makeNode('语言/WebAssembly', 'WebAssembly', ['WASM']),
    makeNode('笔记/零散想法', '零散想法'),
  ]);

  it('按路径、标题、别名、文件名解析', () => {
    expect(lookup('语言/WebAssembly')?.id).toBe('语言/WebAssembly');
    expect(lookup('WebAssembly')?.id).toBe('语言/WebAssembly');
    expect(lookup('wasm')?.id).toBe('语言/WebAssembly');
    expect(lookup('零散想法')?.id).toBe('笔记/零散想法');
  });

  it('兼容 .md 后缀与反斜杠', () => {
    expect(lookup('语言\\WebAssembly.md')?.id).toBe('语言/WebAssembly');
  });

  it('找不到时返回 undefined', () => {
    expect(lookup('不存在的笔记')).toBeUndefined();
  });
});
