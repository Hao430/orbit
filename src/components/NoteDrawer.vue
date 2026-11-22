<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useNoteContent } from '@/composables/useNoteContent';
import type { CelestialNode } from '@/types/celestial';
import { roleTone } from '@/utils/palette';
import { parseOrbitHref } from '@/utils/wikilink-markdown';

interface Props {
  node: CelestialNode | null;
  clusterLabel: string;
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'navigate', target: string): void;
}>();

const { html, loading, error, load } = useNoteContent();
const tone = computed(() => (props.node ? roleTone(props.node.role) : null));

watch(
  [() => props.open, () => props.node?.notePath ?? null],
  ([open, notePath]) => {
    void load(open ? notePath : null);
  },
);

function onBodyClick(event: MouseEvent): void {
  const element = event.target as HTMLElement | null;
  const anchor = element?.closest('a');
  if (!anchor) return;

  const href = anchor.getAttribute('href') ?? '';
  const orbitTarget = parseOrbitHref(href);
  if (orbitTarget) {
    event.preventDefault();
    emit('navigate', orbitTarget);
    return;
  }
  if (/^https?:/i.test(href)) {
    event.preventDefault();
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <aside v-if="node" class="note-drawer" :class="{ 'is-open': open }">
    <header class="drawer-head">
      <span class="drawer-dot" :style="{ background: tone?.core, boxShadow: '0 0 14px ' + tone?.core }" />
      <div class="drawer-heading">
        <p class="drawer-eyebrow">{{ clusterLabel }} · {{ tone?.label }}</p>
        <h2 class="drawer-title">{{ node.title }}</h2>
      </div>
      <button class="drawer-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
    </header>

    <div class="drawer-metrics">
      <div class="metric">
        <span class="metric-label">度数</span>
        <span class="metric-value">{{ node.degree }}</span>
      </div>
      <div class="metric">
        <span class="metric-label">介数</span>
        <span class="metric-value">{{ node.betweenness }}</span>
      </div>
      <div class="metric">
        <span class="metric-label">视界</span>
        <span class="metric-value">{{ node.backbone ? '骨干' : '卫星' }}</span>
      </div>
    </div>

    <div class="drawer-body" @click="onBodyClick">
      <p v-if="loading" class="drawer-state">正在读取天体档案…</p>
      <p v-else-if="error" class="drawer-state drawer-state--error">
        {{ error }}
        <button type="button" class="retry" @click="load(node.notePath)">重试</button>
      </p>
      <article v-else class="prose" v-html="html" />
    </div>

    <footer class="drawer-foot">
      笔记内的 <code>[[双链]]</code> 可直接跳转并点亮对应星体
    </footer>
  </aside>
</template>

<style scoped>
.note-drawer {
  position: fixed;
  top: 16px;
  right: 16px;
  bottom: 16px;
  width: 420px;
  max-width: calc(100vw - 32px);
  z-index: var(--z-inspector);
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: rgba(13, 16, 26, 0.78);
  backdrop-filter: blur(24px) saturate(170%);
  -webkit-backdrop-filter: blur(24px) saturate(170%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-top-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 28px 70px -20px rgba(0, 0, 0, 0.8);
  transform: translateX(calc(100% + 32px));
  opacity: 0;
  transition:
    transform 420ms var(--ease-gravity),
    opacity 320ms var(--ease-collapse);
  pointer-events: none;
}

.note-drawer.is-open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 18px 20px 12px;
}

.drawer-dot {
  flex: none;
  width: 9px;
  height: 9px;
  margin-top: 7px;
  border-radius: 50%;
}

.drawer-heading {
  min-width: 0;
  flex: 1;
}

.drawer-eyebrow {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.drawer-title {
  margin: 0;
  font-size: 19px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--text-primary);
}

.drawer-close {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 200ms var(--ease-gravity);
}

.drawer-close:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
}

.drawer-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 20px 14px;
}

.metric {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.metric-label {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.metric-value {
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-primary);
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 20px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
}

.drawer-body::-webkit-scrollbar {
  width: 6px;
}

.drawer-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
}

.drawer-state {
  margin: 24px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.drawer-state--error {
  color: #fb7185;
}

.retry {
  margin-left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(251, 113, 133, 0.4);
  font-size: 11px;
  color: #fda4af;
}

.drawer-foot {
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px;
  color: var(--text-muted);
}

.drawer-foot code {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.prose {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  margin: 22px 0 10px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-primary);
}

.prose :deep(h1) {
  font-size: 18px;
}

.prose :deep(h2) {
  font-size: 15px;
}

.prose :deep(h3) {
  font-size: 13px;
}

.prose :deep(p) {
  margin: 0 0 12px;
}

.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 12px;
  padding-left: 20px;
}

.prose :deep(li) {
  margin: 4px 0;
}

.prose :deep(li::marker) {
  color: rgba(103, 232, 249, 0.6);
}

.prose :deep(a) {
  color: #67e8f9;
  border-bottom: 1px dashed rgba(103, 232, 249, 0.35);
  transition: border-color 180ms var(--ease-gravity);
}

.prose :deep(a:hover) {
  border-bottom-color: #67e8f9;
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #cbd5e1;
}

.prose :deep(pre) {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(6, 7, 10, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
}

.prose :deep(pre code) {
  padding: 0;
  background: none;
}

.prose :deep(blockquote) {
  margin: 0 0 14px;
  padding: 8px 14px;
  border-left: 2px solid rgba(129, 140, 248, 0.45);
  background: rgba(129, 140, 248, 0.06);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
}

.prose :deep(hr) {
  margin: 20px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
  font-size: 12px;
}

.prose :deep(th),
.prose :deep(td) {
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.prose :deep(th) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}
</style>
