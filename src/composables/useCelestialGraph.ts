import { ref, shallowRef } from 'vue';
import type { CelestialGraph, CelestialNode } from '@/types/celestial';
import { createNoteLookup } from '@/utils/note-lookup';

/**
 * 加载构建期产物 public/graph.json。
 * BASE_URL 兼容 GitHub Pages 的子路径部署。
 */
export function useCelestialGraph() {
  const graph = shallowRef<CelestialGraph | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const resolveNote = shallowRef<(raw: string) => CelestialNode | undefined>(() => undefined);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(import.meta.env.BASE_URL + 'graph.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('图谱数据加载失败（' + response.status + '）');
      const data = (await response.json()) as CelestialGraph;
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        throw new Error('图谱数据结构不正确，请重新执行 pnpm graph:build');
      }
      graph.value = data;
      resolveNote.value = createNoteLookup(data.nodes);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '图谱数据加载失败';
      graph.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { graph, loading, error, resolveNote, load };
}
