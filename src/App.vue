<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import logoLarge from '@/assets/brand/logo.webp';
import logoMark from '@/assets/brand/logo-mark.webp';
import GalaxyHud from '@/components/graph/GalaxyHud.vue';
import GraphToolbar from '@/components/graph/GraphToolbar.vue';
import OrbitGraph from '@/components/graph/OrbitGraph.vue';
import HoverSummaryCard from '@/components/HoverSummaryCard.vue';
import NoteDrawer from '@/components/NoteDrawer.vue';
import { useCelestialGraph } from '@/composables/useCelestialGraph';
import type { CelestialNode } from '@/types/celestial';

const { graph, loading, error, resolveNote, load } = useCelestialGraph();

const graphRef = ref<InstanceType<typeof OrbitGraph> | null>(null);
const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);
const hover = ref<{ node: CelestialNode; x: number; y: number } | null>(null);
const stats = ref({ visibleNodes: 0, visibleEdges: 0, centers: 0 });

const nodeMap = computed(() => {
  if (!graph.value) return new Map<string, CelestialNode>();
  return new Map(graph.value.nodes.map((node) => [node.id, node]));
});

const clusterMap = computed(() => {
  if (!graph.value) return new Map<string, string>();
  return new Map(graph.value.clusters.map((cluster) => [cluster.id, cluster.label]));
});

const selectedNode = computed<CelestialNode | null>(() => {
  if (!selectedId.value) return null;
  return nodeMap.value.get(selectedId.value) ?? null;
});

const selectedClusterLabel = computed(() => {
  if (!selectedNode.value) return '';
  return clusterMap.value.get(selectedNode.value.clusterId) ?? '未归类';
});

const hoverClusterLabel = computed(() => {
  if (!hover.value) return '';
  return clusterMap.value.get(hover.value.node.clusterId) ?? '未归类';
});

const generatedAt = computed(() => {
  if (!graph.value) return '';
  return new Date(graph.value.meta.generatedAt).toLocaleDateString('zh-CN');
});

function handleSelect(payload: { node: CelestialNode | null; active: boolean }): void {
  if (!payload.node) {
    drawerOpen.value = false;
    return;
  }
  selectedId.value = payload.node.id;
  drawerOpen.value = payload.active;
}

function handleHover(payload: { node: CelestialNode; x: number; y: number }): void {
  hover.value = payload;
}

function handleHoverEnd(): void {
  hover.value = null;
}

function handleCanvasClick(): void {
  drawerOpen.value = false;
  hover.value = null;
}

function handleStats(payload: { visibleNodes: number; visibleEdges: number; centers: number }): void {
  stats.value = payload;
}

function handleNavigate(rawTarget: string): void {
  const target = resolveNote.value(rawTarget);
  if (!target) return;
  void graphRef.value?.exploreNode(target.id);
}

function handleReset(): void {
  void graphRef.value?.resetHorizon();
  drawerOpen.value = false;
  selectedId.value = null;
  hover.value = null;
}

function zoomIn(): void {
  void graphRef.value?.zoomIn();
}

function zoomOut(): void {
  void graphRef.value?.zoomOut();
}

function fitView(): void {
  void graphRef.value?.fitView();
}

function closeDrawer(): void {
  drawerOpen.value = false;
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="orbit-shell">
    <header class="app-header" role="banner">
      <div class="brand">
        <div class="brand-mark">
          <img :src="logoMark" alt="Orbit 标志" />
        </div>
        <div class="brand-text">
          <h1>Orbit</h1>
          <p>知识引力图谱 · Knowledge Gravity Graph</p>
        </div>
      </div>

      <div v-if="graph" class="header-meta">
        <span class="meta-chip">{{ graph.meta.nodeCount }} 星体</span>
        <span class="meta-chip">{{ graph.meta.edgeCount }} 连线</span>
        <span class="meta-chip">{{ graph.clusters.length }} 星团</span>
        <span class="meta-chip meta-chip--muted">快照 {{ generatedAt }}</span>
      </div>

      <div class="header-status">
        <span class="status-dot" />
        <span>只读观测</span>
      </div>
    </header>

    <main class="app-main" role="main">
      <OrbitGraph
        v-if="graph"
        ref="graphRef"
        :data="graph"
        @select="handleSelect"
        @hover="handleHover"
        @hover-end="handleHoverEnd"
        @canvas-click="handleCanvasClick"
        @stats="handleStats"
      />

      <GalaxyHud
        v-if="graph"
        :total-nodes="graph.meta.nodeCount"
        :backbone-count="graph.meta.backboneCount"
        :visible-nodes="stats.visibleNodes"
        :visible-edges="stats.visibleEdges"
        :centers="stats.centers"
        :clusters="graph.clusters"
        @reset="handleReset"
      />

      <GraphToolbar
        v-if="graph"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @fit="fitView"
        @reset="handleReset"
      />

      <HoverSummaryCard
        v-if="hover && graph"
        :node="hover.node"
        :x="hover.x"
        :y="hover.y"
        :cluster-label="hoverClusterLabel"
      />

      <div v-if="loading" class="state-layer">
        <div class="orbit-loader">
          <img class="orbit-loader__logo" :src="logoLarge" alt="" />
          <span class="orbit-loader__ring" />
        </div>
        <p class="state-title">正在校准星图</p>
        <p class="state-hint">读取构建期拓扑度量与力导向坐标…</p>
      </div>

      <div v-else-if="error" class="state-layer state-layer--error">
        <p class="state-title">星图加载失败</p>
        <p class="state-hint">{{ error }}</p>
        <button type="button" class="state-action" @click="load">重新校准</button>
      </div>

      <footer v-if="graph" class="floating-hints">
        <span>滚轮缩放</span>
        <span>画布拖拽平移</span>
        <span>星体拖拽重排</span>
        <span>悬停 280ms 预览摘要</span>
        <span>单击展开 1–2 阶引力视界</span>
        <span>抽屉内双链可跳转</span>
      </footer>
    </main>

    <NoteDrawer
      v-if="graph"
      :node="selectedNode"
      :open="drawerOpen"
      :cluster-label="selectedClusterLabel"
      @close="closeDrawer"
      @navigate="handleNavigate"
    />
  </div>
</template>

<style scoped>
.orbit-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--space-void);
}

.app-header {
  position: relative;
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 24px;
  flex: none;
  height: 58px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.055);
  background: rgba(8, 9, 13, 0.72);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 50%;
  border: 1px solid rgba(129, 140, 248, 0.32);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 16px rgba(56, 189, 248, 0.16);
}

.brand-mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-text h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--text-primary);
}

.brand-text p {
  margin: 1px 0 0;
  font-size: 10px;
  letter-spacing: 0.3px;
  color: var(--text-muted);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-chip {
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.03);
  font-size: 10px;
  color: var(--text-secondary);
}

.meta-chip--muted {
  color: var(--text-muted);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 10px;
  letter-spacing: 0.6px;
  color: var(--text-muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

.app-main {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.state-layer {
  position: absolute;
  inset: 0;
  z-index: 150;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: radial-gradient(circle at center, rgba(56, 189, 248, 0.05), transparent 55%);
}

.state-title {
  margin: 14px 0 0;
  font-size: 14px;
  letter-spacing: 1px;
  color: var(--text-primary);
}

.state-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.state-layer--error .state-title {
  color: #fda4af;
}

.state-action {
  margin-top: 14px;
  padding: 7px 18px;
  border-radius: 999px;
  border: 1px solid rgba(129, 140, 248, 0.35);
  background: rgba(129, 140, 248, 0.12);
  font-size: 11px;
  color: #c7d2fe;
}

.orbit-loader {
  position: relative;
  width: 54px;
  height: 54px;
}

.orbit-loader__logo {
  position: absolute;
  inset: 7px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 22px rgba(56, 189, 248, 0.22);
}

.orbit-loader__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(56, 189, 248, 0.18);
  border-top-color: rgba(56, 189, 248, 0.75);
  animation: orbit-spin 1.6s linear infinite;
}

.floating-hints {
  position: absolute;
  left: 50%;
  bottom: 22px;
  z-index: 100;
  display: flex;
  gap: 14px;
  padding: 6px 16px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(10, 12, 19, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 10px;
  color: var(--text-muted);
  pointer-events: none;
  white-space: nowrap;
}

.floating-hints span {
  position: relative;
}

.floating-hints span + span::before {
  content: '·';
  position: absolute;
  left: -9px;
  color: rgba(255, 255, 255, 0.15);
}

@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .header-meta {
    display: none;
  }

  .floating-hints {
    gap: 10px;
    font-size: 9px;
  }
}

@media (max-width: 760px) {
  .floating-hints {
    display: none;
  }

  .brand-text p {
    display: none;
  }
}
</style>
