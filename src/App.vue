<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import logoLarge from '@/assets/brand/logo.webp';
import logoMark from '@/assets/brand/logo-mark.webp';
import GalaxyHud from '@/components/graph/GalaxyHud.vue';
import GraphToolbar from '@/components/graph/GraphToolbar.vue';
import OrbitGraph from '@/components/graph/OrbitGraph.vue';
import HoverSummaryCard from '@/components/HoverSummaryCard.vue';
import NoteDrawer from '@/components/NoteDrawer.vue';
import { useCelestialGraph } from '@/composables/useCelestialGraph';
import type { CelestialNode } from '@/types/celestial';
import { roleTone } from '@/utils/palette';

const { graph, loading, error, resolveNote, load } = useCelestialGraph();

const graphRef = ref<InstanceType<typeof OrbitGraph> | null>(null);
const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);
const hover = ref<{ node: CelestialNode; x: number; y: number } | null>(null);
const stats = ref({ visibleNodes: 0, visibleEdges: 0, centers: 0 });

const searchQuery = ref('');
const searchOpen = ref(false);
const activeSearchIndex = ref(0);
const searchInputRef = ref<HTMLInputElement | null>(null);

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

const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query || !graph.value) return [];
  return graph.value.nodes
    .filter((node) => {
      const matchTitle = node.title.toLowerCase().includes(query);
      const matchId = node.id.toLowerCase().includes(query);
      const matchAliases = (node.aliases ?? []).some((a) => a.toLowerCase().includes(query));
      const matchSummary = (node.summary ?? '').toLowerCase().includes(query);
      return matchTitle || matchId || matchAliases || matchSummary;
    })
    .slice(0, 8);
});

function handleKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    searchInputRef.value?.focus();
    searchOpen.value = true;
  }
}

function selectSearchResult(node: CelestialNode): void {
  searchOpen.value = false;
  searchQuery.value = '';
  void graphRef.value?.exploreNode(node.id);
}

function handleSearchKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (searchResults.value.length > 0) {
      activeSearchIndex.value = (activeSearchIndex.value + 1) % searchResults.value.length;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (searchResults.value.length > 0) {
      activeSearchIndex.value =
        (activeSearchIndex.value - 1 + searchResults.value.length) % searchResults.value.length;
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = searchResults.value[activeSearchIndex.value];
    if (item) selectSearchResult(item);
  } else if (e.key === 'Escape') {
    searchOpen.value = false;
    searchInputRef.value?.blur();
  }
}

function handleSearchBlur(): void {
  window.setTimeout(() => {
    searchOpen.value = false;
  }, 200);
}

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
  searchOpen.value = false;
}

function handleStats(payload: { visibleNodes: number; visibleEdges: number; centers: number }): void {
  stats.value = payload;
}

function handleNavigate(rawTarget: string): void {
  const target = resolveNote.value(rawTarget);
  if (!target) return;
  void graphRef.value?.exploreNode(target.id);
}

function handleHoverLink(rawTarget: string): void {
  const target = resolveNote.value(rawTarget);
  if (target) {
    graphRef.value?.highlightNode(target.id);
  }
}

function handleHoverLinkEnd(): void {
  graphRef.value?.highlightNode(null);
}

function handleFilterCluster(clusterId: string | null): void {
  graphRef.value?.setFilter({ clusterId });
}

function handleFilterRole(role: string | null): void {
  graphRef.value?.setFilter({ role });
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
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
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
        </div>
      </div>

      <div class="header-search-wrap">
        <div class="global-search" :class="{ 'is-focused': searchOpen }">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索星体词条… (⌘K)"
            @focus="searchOpen = true"
            @input="searchOpen = true"
            @blur="handleSearchBlur"
            @keydown="handleSearchKeydown"
          />
          <kbd class="search-kbd">⌘K</kbd>
        </div>

        <div v-if="searchOpen && searchResults.length > 0" class="search-dropdown">
          <div
            v-for="(item, idx) in searchResults"
            :key="item.id"
            class="search-item"
            :class="{ 'is-active': idx === activeSearchIndex }"
            @mousedown.prevent="selectSearchResult(item)"
          >
            <span class="search-item__dot" :style="{ background: roleTone(item.role).core }" />
            <div class="search-item__info">
              <span class="search-item__title">{{ item.title }}</span>
              <span class="search-item__cluster">{{ clusterMap.get(item.clusterId) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="header-status">
        <span v-if="graph" class="header-updated">快照 {{ generatedAt }}</span>
        <span class="status-dot" />
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
        @filter-cluster="handleFilterCluster"
        @filter-role="handleFilterRole"
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
      </div>

      <div v-else-if="error" class="state-layer state-layer--error">
        <p class="state-title">星图加载失败</p>
        <p class="state-hint">{{ error }}</p>
        <button type="button" class="state-action" @click="load">重新校准</button>
      </div>
    </main>

    <NoteDrawer
      v-if="graph"
      :node="selectedNode"
      :open="drawerOpen"
      :cluster-label="selectedClusterLabel"
      :title-resolver="(target: string) => resolveNote(target)?.title"
      @close="closeDrawer"
      @navigate="handleNavigate"
      @hover-link="handleHoverLink"
      @hover-link-end="handleHoverLinkEnd"
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
  animation: brand-aura 4.5s ease-in-out infinite alternate;
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

.header-search-wrap {
  position: relative;
  flex: 1;
  max-width: 420px;
  margin: 0 auto;
}

.global-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 200ms var(--ease-gravity);
}

.global-search:hover,
.global-search.is-focused {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(103, 232, 249, 0.35);
  box-shadow: 0 0 16px rgba(103, 232, 249, 0.12);
}

.search-icon {
  width: 15px;
  height: 15px;
  color: var(--text-muted);
  flex: none;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-kbd {
  flex: none;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-muted);
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 200;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 12px;
  background: rgba(13, 16, 26, 0.92);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.85);
  animation: dropdown-in 180ms var(--ease-gravity);
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 160ms;
}

.search-item:hover,
.search-item.is-active {
  background: rgba(255, 255, 255, 0.07);
}

.search-item__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.search-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.search-item__title {
  font-size: 13px;
  font-weight: 550;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-item__cluster {
  font-size: 10px;
  color: var(--text-muted);
  flex: none;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.header-updated {
  font-size: 11px;
  color: var(--text-muted);
}

.status-dot {
  position: relative;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 10px #34d399;
}

.status-dot::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid #34d399;
  animation: status-radar 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes brand-aura {
  0% {
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 14px rgba(56, 189, 248, 0.16);
    border-color: rgba(129, 140, 248, 0.3);
  }
  100% {
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 24px rgba(56, 189, 248, 0.38);
    border-color: rgba(56, 189, 248, 0.55);
  }
}

@keyframes status-radar {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.8);
    opacity: 0;
  }
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

@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .header-meta {
    display: none;
  }
}
</style>
