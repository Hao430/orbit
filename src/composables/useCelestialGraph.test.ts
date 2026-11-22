import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeGraph, makeNode } from '@/test-utils/fixtures';
import { useCelestialGraph } from './useCelestialGraph';

const jsonResponse = (data: unknown): Response =>
  ({ ok: true, status: 200, json: async () => data }) as unknown as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCelestialGraph', () => {
  it('加载成功时写入图谱并构建查找表', async () => {
    const payload = makeGraph({
      nodes: [makeNode({ id: '语言/WebAssembly', title: 'WebAssembly', aliases: ['WASM'] })],
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const { graph, loading, error, resolveNote, load } = useCelestialGraph();
    await load();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(graph.value?.meta.nodeCount).toBe(1);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(resolveNote.value('wasm')?.id).toBe('语言/WebAssembly');
  });

  it('结构不正确时给出可操作的错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ nodes: 'bad', edges: [] })));

    const { graph, error, load } = useCelestialGraph();
    await load();

    expect(graph.value).toBeNull();
    expect(error.value).toContain('pnpm graph:build');
  });

  it('HTTP 失败时保留状态码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const { error, load } = useCelestialGraph();
    await load();

    expect(error.value).toContain('500');
  });

  it('网络异常时暴露原因', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const { loading, error, load } = useCelestialGraph();
    await load();

    expect(error.value).toBe('offline');
    expect(loading.value).toBe(false);
  });
});
