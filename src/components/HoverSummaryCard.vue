<script setup lang="ts">
import { computed } from 'vue';
import type { CelestialNode } from '@/types/celestial';
import { roleTone } from '@/utils/palette';

interface Props {
  node: CelestialNode;
  clusterLabel: string;
  x: number;
  y: number;
}

const props = defineProps<Props>();

const CARD_WIDTH = 320;
const CARD_HEIGHT = 186;

const tone = computed(() => roleTone(props.node.role));

const position = computed(() => {
  const left = Math.max(16, Math.min(props.x + 22, window.innerWidth - CARD_WIDTH - 16));
  const top = Math.max(16, Math.min(props.y + 22, window.innerHeight - CARD_HEIGHT - 16));
  return { left: left + 'px', top: top + 'px' };
});
</script>

<template>
  <div class="hover-card" :style="position" role="tooltip" aria-live="polite">
    <div class="hover-card__head">
      <span class="hover-card__dot" :style="{ background: tone.core, boxShadow: '0 0 12px ' + tone.core }" />
      <span class="hover-card__cluster">{{ clusterLabel }}</span>
      <span class="hover-card__role">{{ tone.label }}</span>
    </div>
    <h3 class="hover-card__title">{{ node.title }}</h3>
    <p class="hover-card__summary">{{ node.summary || '这篇笔记还没有摘要。' }}</p>
    <div class="hover-card__meta">
      <span>度数 {{ node.degree }}</span>
      <span>介数 {{ node.betweenness }}</span>
      <span v-if="node.backbone">骨干星体</span>
    </div>
    <p class="hover-card__hint">单击展开引力视界 · 抽屉查看全文</p>
  </div>
</template>

<style scoped>
.hover-card {
  position: fixed;
  z-index: 250;
  width: 320px;
  padding: 14px 16px 12px;
  border-radius: 14px;
  background: rgba(13, 16, 26, 0.82);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-top-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 42px -12px rgba(0, 0, 0, 0.75);
  pointer-events: none;
  animation: hover-card-in 220ms var(--ease-gravity);
}

.hover-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.hover-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.hover-card__cluster {
  letter-spacing: 0.4px;
}

.hover-card__role {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  font-size: 10px;
  color: var(--text-secondary);
}

.hover-card__title {
  margin: 8px 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

.hover-card__summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hover-card__meta {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-muted);
}

.hover-card__hint {
  margin: 10px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px;
  color: rgba(103, 232, 249, 0.7);
}

@keyframes hover-card-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
