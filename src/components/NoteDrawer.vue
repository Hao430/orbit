<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useNoteContent } from '@/composables/useNoteContent';
import type { CelestialNode } from '@/types/celestial';
import { roleTone } from '@/utils/palette';
import { parseOrbitHref } from '@/utils/wikilink-markdown';

interface Props {
  node: CelestialNode | null;
  clusterLabel: string;
  open: boolean;
  titleResolver?: (target: string) => string | undefined;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'navigate', target: string): void;
  (e: 'hover-link', target: string): void;
  (e: 'hover-link-end'): void;
}>();

const isWide = ref(false);
const { html, loading, error, load } = useNoteContent(props.titleResolver);
const tone = computed(() => (props.node ? roleTone(props.node.role) : null));

watch(
  [() => props.open, () => props.node?.notePath ?? null],
  ([open, notePath]) => {
    void load(open ? notePath : null);
  },
  { immediate: true },
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

function onBodyMouseOver(event: MouseEvent): void {
  const element = event.target as HTMLElement | null;
  const anchor = element?.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href') ?? '';
  const orbitTarget = parseOrbitHref(href);
  if (orbitTarget) {
    emit('hover-link', orbitTarget);
  }
}

function onBodyMouseOut(event: MouseEvent): void {
  const element = event.target as HTMLElement | null;
  const anchor = element?.closest('a');
  if (anchor) {
    emit('hover-link-end');
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <aside
    v-if="node"
    class="note-drawer"
    :class="{ 'is-open': open, 'is-wide': isWide }"
    role="dialog"
    :aria-label="node.title + ' 天体档案'"
    aria-modal="false"
  >
    <header class="drawer-head">
      <span class="drawer-dot" :style="{ background: tone?.core, boxShadow: '0 0 14px ' + tone?.core }" />
      <div class="drawer-heading">
        <p class="drawer-eyebrow">{{ clusterLabel }} · {{ tone?.label }}</p>
        <h2 class="drawer-title">{{ node.title }}</h2>
      </div>
      <div class="drawer-actions">
        <button
          class="drawer-expand"
          type="button"
          :title="isWide ? '还原抽屉宽度' : '展开宽屏阅读'"
          :aria-label="isWide ? '还原抽屉宽度' : '展开宽屏阅读'"
          @click="isWide = !isWide"
        >
          <svg v-if="!isWide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button class="drawer-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
      </div>
    </header>

    <div class="drawer-metrics">
      <div class="metric" title="度数 (Degree)：与该星体直接关联的双链数量，反映连接广度与基础影响力">
        <span class="metric-label">度数</span>
        <span class="metric-value">{{ node.degree }}</span>
      </div>
      <div class="metric" title="介数中心性 (Betweenness)：在网络所有节点对最短路径中穿过该星体的概率，代表跨领域枢纽/桥梁价值">
        <span class="metric-label">介数</span>
        <span class="metric-value">{{ node.betweenness }}</span>
      </div>
      <div class="metric" title="视界层级：骨干星体（核心拓扑主干）或卫星星体（衍生从属节点）">
        <span class="metric-label">视界</span>
        <span class="metric-value">{{ node.backbone ? '骨干' : '卫星' }}</span>
      </div>
    </div>

    <div
      class="drawer-body"
      @click="onBodyClick"
      @mouseover="onBodyMouseOver"
      @mouseout="onBodyMouseOut"
    >
      <p v-if="loading" class="drawer-state">正在读取天体档案…</p>
      <p v-else-if="error" class="drawer-state drawer-state--error">
        {{ error }}
        <button type="button" class="retry" @click="load(node.notePath)">重试</button>
      </p>
      <article v-else class="prose" v-html="html" />
    </div>
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

.note-drawer.is-wide {
  width: min(780px, calc(100vw - 32px));
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
  animation: drawer-dot-pulse 2.8s ease-in-out infinite;
}

@keyframes drawer-dot-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
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

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.drawer-expand {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 200ms var(--ease-gravity);
}

.drawer-expand:hover {
  color: #67e8f9;
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.08);
  box-shadow: 0 0 10px rgba(103, 232, 249, 0.25);
}

.drawer-expand svg {
  width: 14px;
  height: 14px;
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
  transition: all 240ms var(--ease-gravity);
}

.drawer-close:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
  transform: rotate(90deg) scale(1.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
}

.drawer-close:active {
  transform: rotate(90deg) scale(0.94);
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
  transition:
    transform 220ms var(--ease-gravity),
    border-color 220ms var(--ease-gravity),
    background 220ms var(--ease-gravity);
}

.metric:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(103, 232, 249, 0.25);
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

.prose {
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text-secondary);
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  margin: 24px 0 12px;
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
  margin: 0 0 16px;
}

.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 16px;
  padding-left: 20px;
}

.prose :deep(li) {
  margin: 5px 0;
}

.prose :deep(li::marker) {
  color: rgba(103, 232, 249, 0.6);
}

.prose :deep(a) {
  color: #67e8f9;
  border-bottom: 1px dashed rgba(103, 232, 249, 0.35);
  transition: border-color 180ms var(--ease-gravity), text-shadow 180ms var(--ease-gravity);
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}

.prose :deep(a:hover) {
  border-bottom-color: #67e8f9;
  text-shadow: 0 0 8px rgba(103, 232, 249, 0.45);
}

.prose :deep(a)::after {
  content: '✦';
  font-size: 9px;
  color: rgba(103, 232, 249, 0.65);
  display: inline-block;
  vertical-align: 1px;
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #cbd5e1;
}

.prose :deep(pre) {
  margin: 0 0 16px;
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
  margin: 0 0 16px;
  padding: 8px 14px;
  border-left: 2px solid rgba(129, 140, 248, 0.45);
  background: rgba(129, 140, 248, 0.06);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
}

.prose :deep(hr) {
  margin: 22px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 18px;
  font-size: 12.5px;
}

.prose :deep(th),
.prose :deep(td) {
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.prose :deep(th) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}
</style>
