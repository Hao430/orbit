// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNoteContent } from './useNoteContent';

const textResponse = (text: string, ok = true, status = 200): Response =>
  ({ ok, status, text: async () => text }) as unknown as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useNoteContent', () => {
  it('加载正文并渲染双链', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('## 小节\n\n见 [[渲染管线]]')));

    const { html, loading, error, load } = useNoteContent();
    await load('wiki/a.md');

    expect(html.value).toContain('<h2>小节</h2>');
    expect(html.value).toContain('#orbit=');
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('传入 null 时清空内容', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('正文')));

    const { html, load } = useNoteContent();
    await load('wiki/a.md');
    await load(null);

    expect(html.value).toBe('');
  });

  it('加载失败时给出错误并清空正文', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('', false, 404)));

    const { html, error, load } = useNoteContent();
    await load('wiki/missing.md');

    expect(error.value).toContain('404');
    expect(html.value).toBe('');
  });

  it('快速切换笔记时只保留最后一次结果', async () => {
    let resolveFirst: (value: Response) => void = () => undefined;
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(textResponse('# 第二篇')),
    );

    const { html, load } = useNoteContent();
    const firstLoad = load('wiki/first.md');
    const secondLoad = load('wiki/second.md');

    await secondLoad;
    expect(html.value).toContain('第二篇');

    resolveFirst(textResponse('# 第一篇'));
    await firstLoad;
    expect(html.value).toContain('第二篇');
    expect(html.value).not.toContain('第一篇');
  });
});
