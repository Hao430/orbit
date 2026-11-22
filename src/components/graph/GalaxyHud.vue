<script setup lang="ts">
import { computed } from 'vue';
import type { CelestialCluster } from '@/types/celestial';
import { ROLE_TONES, clusterHue } from '@/utils/palette';

interface Props {
  totalNodes: number;
  backboneCount: number;
  visibleNodes: number;
  visibleEdges: number;
  centers: number;
  clusters: CelestialCluster[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'reset'): void }>();

const roles = computed(() => Object.values(ROLE_TONES));
const coverage = computed(() => {
  if (props.totalNodes === 0) return 0;
  return Math.round((props.visibleNodes / props.totalNodes) * 100);
});
</script>

<template>
  <aside class="galaxy-hud">
    <header class="hud-head">
      <span class="hud-indicator" />
      <div class="hud-heading">
        <p class="hud-eyebrow">DEEP SPACE OBSERVATORY</p>
        <h2 class="hud-title">天体视界探测仪</h2>
      </div>
      <span class="hud-badge">TOP 12%</span>
    </header>

    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-label">骨干星体</span>
        <strong class="stat-value">{{ backboneCount }}<em>/{{ totalNodes }}</em></strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">当前视界</span>
        <strong class="stat-value">{{ visibleNodes }}<em>· {{ coverage }}%</em></strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">引力连线</span>
        <strong class="stat-value">{{ visibleEdges }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">展开焦点</span>
        <strong class="stat-value">{{ centers }}</strong>
      </div>
    </div>

    <section class="hud-section">
      <p class="hud-section-title">星团 · {{ clusters.length }}</p>
      <div class="cluster-list">
        <span v-for="(cluster, index) in clusters" :key="cluster.id" class="cluster-chip">
          <i :style="{ background: clusterHue(index) }" />
          {{ cluster.label }}
          <em>{{ cluster.nodeCount }}</em>
        </span>
      </div>
    </section>

    <section class="hud-section">
      <p class="hud-section-title">星体谱系</p>
      <ul class="legend">
        <li v-for="role in roles" :key="role.label">
          <i :style="{ background: role.core, boxShadow: '0 0 8px ' + role.core }" />
          <span class="legend-name">{{ role.label }}</span>
          <em class="legend-desc">{{ role.description }}</em>
        </li>
      </ul>
    </section>

    <button class="reset-button" type="button" @click="emit('reset')">重置视界</button>
  </aside>
</template>

<style scoped>
.galaxy-hud {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: var(--z-floating-controls);
  width: 302px;
  max-height: calc(100% - 40px);
  overflow-y: auto;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(13, 16, 26, 0.68);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top-color: rgba(255, 255, 255, 0.15);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 40px -14px rgba(0, 0, 0, 0.7);
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.2) transparent;
}

.galaxy-hud::-webkit-scrollbar {
  width: 5px;
}

.galaxy-hud::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 999px;
}

.hud-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hud-indicator {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--star-core);
  box-shadow: 0 0 12px var(--star-core);
  animation: hud-breathe 3.2s infinite var(--ease-gravity);
}

.hud-heading {
  min-width: 0;
}

.hud-eyebrow {
  margin: 0 0 2px;
  font-size: 9px;
  letter-spacing: 1.4px;
  color: var(--text-muted);
}

.hud-title {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.6px;
  color: var(--text-primary);
}

.hud-badge {
  margin-left: auto;
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.32);
  background: rgba(56, 189, 248, 0.12);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: #7dd3fc;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}

.stat-card {
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-label {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  color: var(--text-muted);
}

.stat-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value em {
  margin-left: 4px;
  font-style: normal;
  font-size: 9px;
  font-weight: 400;
  color: var(--text-muted);
}

.hud-section {
  margin-top: 14px;
}

.hud-section-title {
  margin: 0 0 8px;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.cluster-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cluster-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px;
  color: var(--text-secondary);
}

.cluster-chip i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.cluster-chip em {
  font-style: normal;
  color: var(--text-muted);
  font-size: 9px;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  color: var(--text-secondary);
}

.legend i {
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.legend-name {
  flex: none;
  width: 52px;
}

.legend-desc {
  margin-left: auto;
  font-style: normal;
  font-size: 9px;
  color: var(--text-muted);
  text-align: right;
}

.reset-button {
  width: 100%;
  margin-top: 16px;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid rgba(129, 140, 248, 0.3);
  background: rgba(129, 140, 248, 0.1);
  font-size: 11px;
  color: #c7d2fe;
  transition: all 220ms var(--ease-gravity);
}

.reset-button:hover {
  background: rgba(129, 140, 248, 0.18);
  border-color: rgba(129, 140, 248, 0.45);
}

@keyframes hud-breathe {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}
</style>
