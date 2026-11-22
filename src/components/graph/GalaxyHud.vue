<script setup lang="ts">
import { computed, ref } from 'vue';
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
const emit = defineEmits<{
  (e: 'reset'): void;
  (e: 'filter-cluster', id: string | null): void;
  (e: 'filter-role', role: string | null): void;
}>();

const collapsed = ref(false);
const activeClusterId = ref<string | null>(null);
const activeRole = ref<string | null>(null);

const roles = Object.entries(ROLE_TONES).map(([key, tone]) => ({
  key,
  ...tone,
}));

const coverage = computed(() => {
  if (props.totalNodes === 0) return 0;
  return Math.round((props.visibleNodes / props.totalNodes) * 100);
});

function toggleCluster(id: string): void {
  activeClusterId.value = activeClusterId.value === id ? null : id;
  emit('filter-cluster', activeClusterId.value);
}

function toggleRole(roleKey: string): void {
  activeRole.value = activeRole.value === roleKey ? null : roleKey;
  emit('filter-role', activeRole.value);
}

function handleReset(): void {
  activeClusterId.value = null;
  activeRole.value = null;
  emit('reset');
}
</script>

<template>
  <button
    v-if="collapsed"
    class="hud-pill"
    type="button"
    title="展开天体探测仪"
    aria-label="展开天体探测仪"
    @click="collapsed = false"
  >
    <span class="hud-indicator" />
    <span>探测仪 · {{ visibleNodes }}星</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>

  <aside
    v-else
    class="galaxy-hud"
    role="region"
    aria-label="天体视界探测仪"
  >
    <header class="hud-head">
      <span class="hud-indicator" />
      <div class="hud-heading">
        <h2 class="hud-title">天体视界探测仪</h2>
      </div>
      <button
        class="hud-fold-btn"
        type="button"
        title="收起探测仪"
        aria-label="收起探测仪"
        @click="collapsed = true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
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
      <div class="hud-section-header">
        <p class="hud-section-title">星团 · {{ clusters.length }}</p>
        <button
          v-if="activeClusterId"
          class="hud-filter-clear"
          type="button"
          @click="toggleCluster(activeClusterId!)"
        >
          清除
        </button>
      </div>
      <div class="cluster-list">
        <span
          v-for="(cluster, index) in clusters"
          :key="cluster.id"
          class="cluster-chip"
          :class="{ 'is-active': activeClusterId === cluster.id }"
          @click="toggleCluster(cluster.id)"
        >
          <i :style="{ background: clusterHue(index) }" />
          {{ cluster.label }}
          <em>{{ cluster.nodeCount }}</em>
        </span>
      </div>
    </section>

    <section class="hud-section">
      <div class="hud-section-header">
        <p class="hud-section-title">星体谱系</p>
        <button
          v-if="activeRole"
          class="hud-filter-clear"
          type="button"
          @click="toggleRole(activeRole!)"
        >
          清除
        </button>
      </div>
      <ul class="legend">
        <li
          v-for="role in roles"
          :key="role.label"
          :class="{ 'is-active': activeRole === role.key }"
          @click="toggleRole(role.key)"
        >
          <i :style="{ background: role.core, boxShadow: '0 0 8px ' + role.core }" />
          <span class="legend-name">{{ role.label }}</span>
        </li>
      </ul>
    </section>

    <button class="reset-button" type="button" @click="handleReset">重置视界</button>
  </aside>
</template>

<style scoped>
.hud-pill {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: var(--z-floating-controls);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(13, 16, 26, 0.85);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-top-color: rgba(255, 255, 255, 0.22);
  box-shadow: 0 10px 28px -8px rgba(0, 0, 0, 0.7);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  animation: hud-pill-in 240ms var(--ease-gravity);
  transition: all 200ms var(--ease-gravity);
}

.hud-pill:hover {
  background: rgba(22, 27, 44, 0.9);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px -6px rgba(0, 0, 0, 0.75), 0 0 14px rgba(56, 189, 248, 0.2);
}

.hud-pill svg {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
}

@keyframes hud-pill-in {
  from {
    opacity: 0;
    transform: translateX(-12px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

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
  animation: hud-enter 480ms var(--ease-gravity) both;
}

@keyframes hud-enter {
  from {
    opacity: 0;
    transform: translateX(-16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
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

.hud-fold-btn {
  margin-left: auto;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--text-muted);
  transition: all 200ms var(--ease-gravity);
}

.hud-fold-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

.hud-fold-btn svg {
  width: 14px;
  height: 14px;
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

.hud-title {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.6px;
  color: var(--text-primary);
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
  transition: all 220ms var(--ease-gravity);
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(56, 189, 248, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.4), 0 0 12px rgba(56, 189, 248, 0.1);
}

.stat-label {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  font-weight: 500;
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

.hud-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.hud-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hud-filter-clear {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 9px;
  color: #67e8f9;
  transition: background 160ms;
}

.hud-filter-clear:hover {
  background: rgba(103, 232, 249, 0.15);
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
  transition: all 200ms var(--ease-gravity);
  cursor: pointer;
}

.cluster-chip:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px) scale(1.03);
}

.cluster-chip.is-active {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
  color: #ffffff;
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
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 200ms var(--ease-gravity);
  cursor: pointer;
}

.legend li:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  transform: translateX(3px);
}

.legend li.is-active {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

.legend li:hover i {
  transform: scale(1.4);
  filter: brightness(1.3);
}

.legend i {
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  transition: transform 200ms var(--ease-gravity), filter 200ms;
}

.legend-name {
  flex: none;
  width: 52px;
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
  background: rgba(129, 140, 248, 0.22);
  border-color: rgba(129, 140, 248, 0.55);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px -4px rgba(129, 140, 248, 0.35);
}

.reset-button:active {
  transform: scale(0.98);
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
