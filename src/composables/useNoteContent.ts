import { ref } from 'vue';
import { renderMarkdown } from '@/utils/markdown';

/** 抽屉正文按需拉取 public/wiki/*.md，避免把 2k 篇笔记塞进首屏 JSON */
export function useNoteContent(titleResolver?: (target: string) => string | undefined) {
  const html = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  let requestId = 0;

  async function load(notePath: string | null): Promise<void> {
    const current = ++requestId;
    error.value = null;

    if (!notePath) {
      html.value = '';
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const response = await fetch(import.meta.env.BASE_URL + notePath);
      if (!response.ok) throw new Error('正文加载失败（' + response.status + '）');
      const source = await response.text();
      if (current !== requestId) return;
      html.value = renderMarkdown(source, titleResolver);
    } catch (cause) {
      if (current !== requestId) return;
      html.value = '';
      error.value = cause instanceof Error ? cause.message : '正文加载失败';
    } finally {
      if (current === requestId) loading.value = false;
    }
  }

  return { html, loading, error, load };
}
