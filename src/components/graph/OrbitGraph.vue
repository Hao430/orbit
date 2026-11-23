<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  CanvasEvent,
  Graph,
  GraphEvent,
  NodeEvent,
  type CustomPluginOption,
  type EdgeData,
  type GraphData,
  type IElementEvent,
  type NodeData,
} from '@antv/g6';
import type { CelestialEdge, CelestialGraph, CelestialNode } from '@/types/celestial';
import StarfieldBackdrop from '@/components/graph/StarfieldBackdrop.vue';
import { edgeStyle, nodeStyle, type Hop } from '@/utils/graph-visual';
import { CLUSTER_HUES, clusterHue, withAlpha } from '@/utils/palette';
import {
  createHorizonState,
  snapshotHorizon,
  toggleHorizon,
  type HorizonSnapshot,
  type HorizonState,
} from '@/utils/horizon';

interface Props {
  data: CelestialGraph;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', payload: { node: CelestialNode | null; active: boolean }): void;
  (e: 'canvas-click'): void;
  (e: 'hover', payload: { node: CelestialNode; x: number; y: number }): void;
  (e: 'hover-end'): void;
  (e: 'stats', payload: { visibleNodes: number; visibleEdges: number; centers: number }): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
let graphInstance: Graph | null = null;

const nodeById = new Map<string, CelestialNode>(props.data.nodes.map((node) => [node.id, node]));
const edgeById = new Map<string, CelestialEdge>(props.data.edges.map((edge) => [edge.id, edge]));
const backbone = new Set<string>(
  props.data.nodes.filter((node) => node.backbone).map((node) => node.id),
);
const clusterTone = new Map<string, string>(
  props.data.clusters.map((cluster, index) => [cluster.id, clusterHue(index)]),
);

let horizon: HorizonState = createHorizonState();
let shownHops = new Map<string, Hop>();
let shownEdgeHops = new Map<string, Hop>();
let applyToken = 0;
let revealTimer: number | undefined;
let hoverTimer: number | undefined;
let isDraggingNode = false;
let dragTimer: number | undefined;

const activeRings = ref<Array<{ id: string; cx: number; cy: number; r1: number; r2: number }>>([]);
const highlightTargetPos = ref<{ x: number; y: number } | null>(null);
let currentHighlightId: string | null = null;

type OrbitRing = { id: string; cx: number; cy: number; r1: number; r2: number };

/** 拖拽/缩放时 afterrender 与 aftertransform 会连着触发：每帧只写一次 DOM，值没变就不写。 */
let overlayFrame = 0;

function sameRings(a: OrbitRing[], b: OrbitRing[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((ring, index) => {
    const prev = b[index];
    return (
      prev.id === ring.id &&
      prev.cx === ring.cx &&
      prev.cy === ring.cy &&
      prev.r1 === ring.r1 &&
      prev.r2 === ring.r2
    );
  });
}

const OVERLAY_RETRY_LIMIT = 30;
let overlayRetry = 0;

function scheduleOverlaySync(): void {
  if (overlayFrame !== 0) return;
  overlayFrame = window.requestAnimationFrame(() => {
    overlayFrame = 0;
    const ringsOk = updateRings();
    const highlightOk = refreshHighlight();
    // 元素刚加入时位置查询会落空，而之后不一定还有渲染事件：主动重试几帧兜底
    if ((!ringsOk || !highlightOk) && overlayRetry < OVERLAY_RETRY_LIMIT) {
      overlayRetry += 1;
      scheduleOverlaySync();
    } else {
      overlayRetry = 0;
    }
  });
}

let overlayTicker = 0;

/** G6 的展开动画期间不会派发 afterrender/aftertransform，环和雷达点靠这个短时 ticker 跟住星体。 */
function startOverlayTicker(durationMs = 1800): void {
  if (overlayTicker !== 0) window.cancelAnimationFrame(overlayTicker);
  const deadline = performance.now() + durationMs;
  const tick = (now: number): void => {
    updateRings();
    refreshHighlight();
    overlayTicker = now < deadline ? window.requestAnimationFrame(tick) : 0;
  };
  overlayTicker = window.requestAnimationFrame(tick);
}

function retryOverlay(): void {
  if (overlayRetry >= OVERLAY_RETRY_LIMIT) return;
  overlayRetry += 1;
  scheduleOverlaySync();
}

function updateRings(): boolean {
  if (!graphInstance) {
    if (activeRings.value.length > 0) activeRings.value = [];
    return true;
  }
  const zoom = typeof graphInstance.getZoom === 'function' ? graphInstance.getZoom() : 1;
  const rings: OrbitRing[] = [];
  let unresolved = false;
  for (const centerId of horizon.centers) {
    try {
      const pos = graphInstance.getElementPosition?.(centerId) as [number, number] | undefined;
      if (!pos || !Array.isArray(pos)) {
        unresolved = true;
        continue;
      }
      const vp = (typeof graphInstance.getViewportByCanvas === 'function'
        ? graphInstance.getViewportByCanvas(pos)
        : pos) as [number, number];
      if (vp && Array.isArray(vp)) {
        rings.push({
          id: centerId,
          cx: vp[0],
          cy: vp[1],
          r1: 85 * zoom,
          r2: 175 * zoom,
        });
      } else {
        unresolved = true;
      }
    } catch {
      unresolved = true;
    }
  }
  if (!sameRings(rings, activeRings.value)) activeRings.value = rings;
  if (unresolved) retryOverlay();
  return !unresolved;
}

function refreshHighlight(): boolean {
  if (!currentHighlightId || !graphInstance) {
    highlightTargetPos.value = null;
    return true;
  }
  try {
    const pos = graphInstance.getElementPosition?.(currentHighlightId) as [number, number] | undefined;
    if (!pos || !Array.isArray(pos)) {
      highlightTargetPos.value = null;
      retryOverlay();
      return false;
    }
    const vp = (typeof graphInstance.getViewportByCanvas === 'function'
      ? graphInstance.getViewportByCanvas(pos)
      : pos) as [number, number];
    if (vp && Array.isArray(vp)) {
      const prev = highlightTargetPos.value;
      if (!prev || prev.x !== vp[0] || prev.y !== vp[1]) {
        highlightTargetPos.value = { x: vp[0], y: vp[1] };
      }
    }
  } catch {
    highlightTargetPos.value = null;
    retryOverlay();
    return false;
  }
  return true;
}

function highlightNode(id: string | null): void {
  currentHighlightId = id;
  refreshHighlight();
}

function setFilter(filter: { clusterId?: string | null; role?: string | null }): void {
  if (!graphInstance) return;
  const { clusterId, role } = filter;
  const hasFilter = Boolean(clusterId || role);
  for (const [id, hop] of shownHops) {
    const node = nodeById.get(id);
    if (!node) continue;
    const matchCluster = !clusterId || node.clusterId === clusterId;
    const matchRole = !role || node.role === role;
    const matches = matchCluster && matchRole;
    const targetOpacity = hasFilter ? (matches ? 1 : 0.15) : 1;
    graphInstance.updateNodeData?.([{
      id,
      style: {
        opacity: targetOpacity,
        labelOpacity: hasFilter ? (matches ? 1 : 0) : (hop === 2 ? 0 : 1),
      },
    }]);
  }
  for (const [id] of shownEdgeHops) {
    const edge = edgeById.get(id);
    if (!edge) continue;
    const sNode = nodeById.get(edge.source);
    const tNode = nodeById.get(edge.target);
    const sMatch = !clusterId || sNode?.clusterId === clusterId;
    const tMatch = !clusterId || tNode?.clusterId === clusterId;
    const targetOpacity = hasFilter ? (sMatch && tMatch ? 0.8 : 0.05) : 1;
    graphInstance.updateEdgeData?.([{
      id,
      style: { opacity: targetOpacity },
    }]);
  }
}

const ORIGIN = { x: 1000, y: 600 };

/**
 * 运行时力导布局：以构建期坐标为起点做局部重排，并按星团聚类，形成"自生长"。
 * 节点数只有几十个，一次 120 迭代足够收敛，不会卡住主线程。
 */
const FORCE_LAYOUT = {
  type: 'force' as const,
  animation: true,
  iterations: 80,
  minMovement: 3,
  preventOverlap: true,
  // 布局结果会写回 style.size，这里必须返回真实视觉尺寸，否则节点会被放大
  nodeSize: (node: { style?: unknown }) => {
    const size = (node.style as { size?: number } | undefined)?.size ?? 10;
    return size + 2;
  },
  linkDistance: (edge: { data?: unknown }) => {
    const weight = (edge.data as { weight?: number } | undefined)?.weight ?? 1;
    return Math.max(180, 460 - weight * 26);
  },
  nodeStrength: -900,
  edgeStrength: 40,
  clustering: true,
  nodeClusterBy: (node: { data?: unknown }) =>
    String((node.data as { clusterId?: string } | undefined)?.clusterId ?? 'none'),
  clusterNodeStrength: 40,
};
const HOP2_DELAY = 160;
const HOVER_DELAY = 280;

function toNodeData(node: CelestialNode, hop: Hop, origin?: { x: number; y: number }): NodeData {
  const style = nodeStyle(node, hop);
  if (origin) {
    style.x = origin.x;
    style.y = origin.y;
    style.opacity = 0;
  }
  return {
    id: node.id,
    data: { hop, clusterId: node.clusterId },
    style: style as NodeData['style'],
  };
}

function toEdgeData(edge: CelestialEdge, hop: Hop): EdgeData {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: { hop, weight: edge.weight, kind: edge.kind },
    style: edgeStyle(hop) as EdgeData['style'],
  };
}

function buildGraphData(snapshot: HorizonSnapshot): GraphData {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  for (const [id, hop] of snapshot.nodes) {
    const node = nodeById.get(id);
    if (node) nodes.push(toNodeData(node, hop));
  }
  for (const [id, hop] of snapshot.edges) {
    const edge = edgeById.get(id);
    if (edge) edges.push(toEdgeData(edge, hop));
  }
  return { nodes, edges };
}

const HULL_MIN_NODES = 4;
const HULL_MAX_CLUSTERS = 16;
let hullClusters = props.data.clusters
  .filter((cluster) => cluster.nodeCount >= HULL_MIN_NODES)
  .slice(0, HULL_MAX_CLUSTERS);

const CLUSTER_FALLBACK = CLUSTER_HUES[0];

function hullOptions(): CustomPluginOption[] {
  return hullClusters.map((cluster) => {
    const hue = clusterTone.get(cluster.id) ?? CLUSTER_FALLBACK;
    return {
      type: 'hull',
      key: 'hull-' + cluster.id,
      members: [] as string[],
      padding: 28,
      concavity: Infinity,
      corner: 'rounded',
      fill: withAlpha(hue, 0.035),
      stroke: withAlpha(hue, 0.14),
      lineWidth: 1,
      strokeOpacity: 0.5,
      label: false,
      pointerEvents: 'none',
    };
  });
}

function updateHulls(): void {
  if (!graphInstance) return;
  const membersByCluster = new Map<string, string[]>();
  for (const id of shownHops.keys()) {
    const clusterId = nodeById.get(id)?.clusterId;
    if (clusterId) {
      let list = membersByCluster.get(clusterId);
      if (!list) {
        list = [];
        membersByCluster.set(clusterId, list);
      }
      list.push(id);
    }
  }
  for (const cluster of hullClusters) {
    const members = membersByCluster.get(cluster.id) ?? [];
    graphInstance.updatePlugin({
      key: 'hull-' + cluster.id,
      members: members.length >= 3 ? members : [],
    });
  }
}

watch(
  () => props.data,
  (newData) => {
    nodeById.clear();
    for (const node of newData.nodes) nodeById.set(node.id, node);
    edgeById.clear();
    for (const edge of newData.edges) edgeById.set(edge.id, edge);
    backbone.clear();
    for (const node of newData.nodes) {
      if (node.backbone) backbone.add(node.id);
    }
    clusterTone.clear();
    newData.clusters.forEach((cluster, index) => {
      clusterTone.set(cluster.id, clusterHue(index));
    });
    hullClusters = newData.clusters
      .filter((cluster) => cluster.nodeCount >= HULL_MIN_NODES)
      .slice(0, HULL_MAX_CLUSTERS);
  },
  { deep: false },
);

/** 把运行时布局/拖拽后的实时坐标写回节点数据，避免下次动画从陈旧坐标起飞。 */
function syncNodePositions(): void {
  if (!graphInstance) return;
  for (const [id, node] of nodeById) {
    if (!shownHops.has(id)) continue;
    try {
      const pos = graphInstance.getElementPosition(id) as [number, number] | undefined;
      if (pos && Array.isArray(pos)) {
        node.x = pos[0];
        node.y = pos[1];
      }
    } catch {
      // 元素还没创建，跳过
    }
  }
}

async function runLayout(): Promise<void> {
  const graph = graphInstance;
  if (!graph) return;
  graph.stopLayout?.();
  try {
    await graph.layout?.(FORCE_LAYOUT);
  } catch {
    // 布局失败只是没重排，不影响视界与交互
  }
}

function emitStats(): void {
  emit('stats', {
    visibleNodes: shownHops.size,
    visibleEdges: shownEdgeHops.size,
    centers: horizon.centers.size,
  });
}

function clearRevealTimer(): void {
  if (revealTimer !== undefined) {
    window.clearTimeout(revealTimer);
    revealTimer = undefined;
  }
}

async function applySnapshot(next: HorizonSnapshot, animate: boolean): Promise<void> {
  const graph = graphInstance;
  if (!graph) return;
  clearRevealTimer();
  // 上一次布局还在迭代就先停掉，避免两套力互相拉扯
  graphInstance?.stopLayout?.();
  const token = ++applyToken;
  // 展开/收拢整条动画链（含 2 阶延迟）期间都让环跟住
  if (animate) startOverlayTicker(2600);

  const removedEdgeIds = [...shownEdgeHops.keys()].filter((id) => !next.edges.has(id));
  const removedNodeIds = [...shownHops.keys()].filter((id) => !next.nodes.has(id));
  const promotedNodes = [...next.nodes.entries()].filter(
    ([id, hop]) => shownHops.has(id) && shownHops.get(id) !== hop,
  );
  const promotedEdges = [...next.edges.entries()].filter(
    ([id, hop]) => shownEdgeHops.has(id) && shownEdgeHops.get(id) !== hop,
  );
  const addedNodes = [...next.nodes.entries()].filter(([id]) => !shownHops.has(id));
  const addedEdges = [...next.edges.entries()].filter(([id]) => !shownEdgeHops.has(id));

  if (removedEdgeIds.length > 0) graph.removeEdgeData(removedEdgeIds);
  if (removedNodeIds.length > 0) graph.removeNodeData(removedNodeIds);
  for (const id of removedEdgeIds) shownEdgeHops.delete(id);
  for (const id of removedNodeIds) shownHops.delete(id);

  if (promotedNodes.length > 0) {
    graph.updateNodeData(
      promotedNodes.map(([id, hop]) => ({ id, style: nodeStyle(nodeById.get(id)!, hop) as NodeData['style'] })),
    );
    for (const [id, hop] of promotedNodes) shownHops.set(id, hop);
  }
  if (promotedEdges.length > 0) {
    graph.updateEdgeData(
      promotedEdges.map(([id, hop]) => ({ id, style: edgeStyle(hop) as EdgeData['style'] })),
    );
    for (const [id, hop] of promotedEdges) shownEdgeHops.set(id, hop);
  }

  const focusNode = next.focus ? nodeById.get(next.focus) : undefined;
  const origin = focusNode ? { x: focusNode.x, y: focusNode.y } : ORIGIN;

  const addBatch = async (
    batch: Array<[string, Hop]>,
    edges: Array<[string, Hop]>,
    withOrigin: boolean,
  ): Promise<void> => {
    if (batch.length === 0) return;
    for (const [id, hop] of batch) shownHops.set(id, hop);
    graph.addNodeData(batch.map(([id, hop]) => {
      const node = nodeById.get(id)!;
      return animate && withOrigin ? toNodeData(node, hop, origin) : toNodeData(node, hop);
    }));

    const ready = edges.filter(([id]) => {
      const edge = edgeById.get(id);
      return edge ? shownHops.has(edge.source) && shownHops.has(edge.target) : false;
    });
    for (const [id, hop] of ready) shownEdgeHops.set(id, hop);
    if (ready.length > 0) {
      graph.addEdgeData(ready.map(([id, hop]) => toEdgeData(edgeById.get(id)!, hop)));
    }

    await graph.draw();
    if (token !== applyToken) return;

    if (animate && withOrigin) {
      graph.updateNodeData(batch.map(([id, hop]) => ({
        id,
        style: nodeStyle(nodeById.get(id)!, hop) as NodeData['style'],
      })));
      await graph.draw();
    }
  };

  const immediate = addedNodes.filter(([, hop]) => hop !== 2);
  const delayed = addedNodes.filter(([, hop]) => hop === 2);

  await addBatch(immediate, addedEdges, true);

  if (delayed.length > 0 && animate) {
    clearRevealTimer();
    revealTimer = window.setTimeout(() => {
      if (token !== applyToken) return;
      const remaining = addedEdges.filter(([id]) => !shownEdgeHops.has(id));
      void addBatch(delayed, remaining, true).then(() => {
        if (token !== applyToken) return;
        updateHulls();
        emitStats();
        void runLayout();
      });
    }, HOP2_DELAY);
  } else if (delayed.length > 0) {
    await addBatch(delayed, addedEdges, false);
  }

  updateHulls();
  emitStats();
  void runLayout();
}

async function handleNodeClick(event: IElementEvent): Promise<void> {
  if (isDraggingNode) return;
  const id = event.target?.id;
  if (!id) return;
  const node = nodeById.get(id);
  if (!node) return;

  clearHoverTimer();
  emit('hover-end');

  const wasActive = horizon.centers.has(id);
  horizon = toggleHorizon(horizon, id, props.data.edges, backbone);
  await applySnapshot(snapshotHorizon(horizon, props.data.edges, backbone), true);
  emit('select', { node, active: !wasActive });

  if (!wasActive) {
    await graphInstance?.focusElement(id, { duration: 520, easing: 'ease-in-out' });
  }
}

function clearHoverTimer(): void {
  if (hoverTimer !== undefined) {
    window.clearTimeout(hoverTimer);
    hoverTimer = undefined;
  }
}

function bindEvents(graph: Graph): void {
  graph.on(NodeEvent.DRAG_START, () => {
    isDraggingNode = true;
    clearHoverTimer();
    emit('hover-end');
  });

  graph.on(NodeEvent.DRAG_END, (event: IElementEvent) => {
    const id = event.target?.id;
    if (id) {
      const position = graph.getElementPosition?.(id);
      const node = nodeById.get(id);
      if (node && position) {
        node.x = position[0];
        node.y = position[1];
      }
    }
    updateHulls();
    updateRings();
    refreshHighlight();
    if (dragTimer !== undefined) window.clearTimeout(dragTimer);
    dragTimer = window.setTimeout(() => {
      isDraggingNode = false;
    }, 60);
  });

  graph.on(NodeEvent.CLICK, (event: IElementEvent) => {
    void handleNodeClick(event);
  });

  graph.on(CanvasEvent.CLICK, () => {
    emit('canvas-click');
  });

  graph.on(GraphEvent.AFTER_LAYOUT, () => {
    syncNodePositions();
    updateHulls();
    scheduleOverlaySync();
  });

  graph.on(GraphEvent.AFTER_TRANSFORM, scheduleOverlaySync);
  graph.on(GraphEvent.AFTER_RENDER, scheduleOverlaySync);

  graph.on(NodeEvent.POINTER_OVER, (event: IElementEvent) => {
    const id = event.target?.id;
    if (!id || !nodeById.has(id)) return;
    clearHoverTimer();
    const point = { x: event.client.x, y: event.client.y };
    hoverTimer = window.setTimeout(() => {
      const node = nodeById.get(id);
      if (node) emit('hover', { node, x: point.x, y: point.y });
    }, HOVER_DELAY);
  });

  graph.on(NodeEvent.POINTER_OUT, () => {
    clearHoverTimer();
    emit('hover-end');
  });
}

onMounted(async () => {
  if (!containerRef.value) return;

  const initial = snapshotHorizon(horizon, props.data.edges, backbone);

  graphInstance = new Graph({
    container: containerRef.value,
    autoResize: true,
    background: 'transparent',
    // 限制缩放区间：缩太远整图变一个点，放太近只剩糊
    zoomRange: [0.4, 2.4],
    data: buildGraphData(initial),
    node: {
      type: 'circle',
      style: {
        cursor: 'pointer',
        halo: true,
        labelPlacement: 'bottom',
        labelOffsetY: 7,
        labelFontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
      },
      state: {
        active: {
          haloOpacity: 0.62,
          haloLineWidth: 26,
          lineWidth: 2,
        },
        inactive: {
          opacity: 0.24,
          labelOpacity: 0.12,
        },
      },
      animation: {
        enter: [{ fields: ['opacity'], duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }],
        update: [
          {
            fields: ['x', 'y', 'opacity', 'size'],
            duration: 620,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          },
        ],
      },
    },
    edge: {
      type: 'line',
      style: { endArrow: false, lineAppendWidth: 4 },
      state: {
        active: { stroke: '#67e8f9', lineWidth: 2, strokeOpacity: 0.9 },
        inactive: { strokeOpacity: 0.05 },
      },
      animation: {
        enter: [{ fields: ['opacity'], duration: 420 }],
      },
    },
    behaviors: [
      'drag-canvas',
      { type: 'drag-element', dropEffect: 'move', shadow: false },
      { type: 'zoom-canvas', sensitivity: 1.15, animation: { duration: 120 } },
      {
        type: 'hover-activate',
        degree: 1,
        state: 'active',
        inactiveState: 'inactive',
        enable: () => !isDraggingNode,
      },
      { type: 'auto-adapt-label', sortNode: { type: 'degree' }, padding: 8 },
    ],
    plugins: hullOptions(),
  });

  shownHops = new Map(initial.nodes);
  shownEdgeHops = new Map(initial.edges);

  await graphInstance.render();
  bindEvents(graphInstance);
  updateHulls();
  emitStats();
  await graphInstance.fitView();
});

onBeforeUnmount(() => {
  if (overlayFrame !== 0) {
    window.cancelAnimationFrame(overlayFrame);
    overlayFrame = 0;
  }
  if (overlayTicker !== 0) {
    window.cancelAnimationFrame(overlayTicker);
    overlayTicker = 0;
  }
  clearRevealTimer();
  clearHoverTimer();
  if (dragTimer !== undefined) {
    window.clearTimeout(dragTimer);
    dragTimer = undefined;
  }
  if (graphInstance) {
    graphInstance.destroy();
    graphInstance = null;
  }
});

async function zoomIn(): Promise<void> {
  await graphInstance?.zoomBy(1.2);
}

async function zoomOut(): Promise<void> {
  await graphInstance?.zoomBy(0.8);
}

async function fitView(): Promise<void> {
  await graphInstance?.fitView(undefined, { duration: 420, easing: 'ease-in-out' });
}

async function resetHorizon(): Promise<void> {
  clearRevealTimer();
  horizon = createHorizonState();
  await applySnapshot(snapshotHorizon(horizon, props.data.edges, backbone), false);
  emit('select', { node: null, active: false });
  updateRings();
  await graphInstance?.fitView(undefined, { duration: 420, easing: 'ease-in-out' });
}

async function exploreNode(id: string): Promise<boolean> {
  const node = nodeById.get(id);
  if (!node || !graphInstance) return false;
  if (!horizon.centers.has(id)) {
    horizon = toggleHorizon(horizon, id, props.data.edges, backbone);
    await applySnapshot(snapshotHorizon(horizon, props.data.edges, backbone), true);
  }
  emit('select', { node, active: true });
  await graphInstance.focusElement(id, { duration: 520, easing: 'ease-in-out' });
  updateRings();
  return true;
}

defineExpose({ zoomIn, zoomOut, fitView, resetHorizon, exploreNode, highlightNode, setFilter });
</script>

<template>
  <div class="orbit-graph-container">
    <StarfieldBackdrop />
    <div ref="containerRef" class="orbit-graph" />
    <svg v-if="activeRings.length || highlightTargetPos" class="orbit-overlay" aria-hidden="true">
      <g v-for="ring in activeRings" :key="ring.id">
        <circle :cx="ring.cx" :cy="ring.cy" :r="ring.r1" class="orbit-ring orbit-ring--inner" />
        <circle :cx="ring.cx" :cy="ring.cy" :r="ring.r2" class="orbit-ring orbit-ring--outer" />
      </g>
      <g v-if="highlightTargetPos" class="radar-ping-group">
        <circle :cx="highlightTargetPos.x" :cy="highlightTargetPos.y" r="24" class="radar-ping" />
        <circle :cx="highlightTargetPos.x" :cy="highlightTargetPos.y" r="6" class="radar-ping-core" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.orbit-graph-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--space-void);
}

/* 星云独立成层做 transform 漂移：只走合成器，不再每帧重绘整屏背景 */
.orbit-graph-container::before {
  content: '';
  position: absolute;
  inset: -12%;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 22%, rgba(56, 189, 248, 0.07), transparent 42%),
    radial-gradient(circle at 78% 72%, rgba(168, 85, 247, 0.08), transparent 48%),
    radial-gradient(circle at 55% 45%, rgba(52, 211, 153, 0.04), transparent 55%);
  will-change: transform;
  animation: nebula-drift 42s ease-in-out infinite alternate;
}

.orbit-graph {
  position: absolute;
  inset: 0;
  z-index: 2;
  cursor: grab;
  background: transparent;
}

@keyframes nebula-drift {
  from {
    transform: translate3d(-1.5%, -1%, 0) scale(1.02);
  }
  to {
    transform: translate3d(1.5%, 1%, 0) scale(1.06);
  }
}

.orbit-graph:active {
  cursor: grabbing;
}

.orbit-graph::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--space-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--space-grid) 1px, transparent 1px);
  background-size: 120px 120px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.9), transparent 78%);
  will-change: opacity;
  animation: grid-breathe 10s ease-in-out infinite alternate;
}

@keyframes grid-breathe {
  0% {
    opacity: 0.6;
  }
  100% {
    opacity: 0.95;
  }
}

.orbit-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.orbit-ring {
  fill: none;
  transition: r 120ms ease, cx 120ms ease, cy 120ms ease;
  animation: orbit-ring-spin 9s linear infinite;
}

.orbit-ring--outer {
  animation-duration: 14s;
  animation-direction: reverse;
}

@keyframes orbit-ring-spin {
  to {
    stroke-dashoffset: -40;
  }
}

.orbit-ring--inner {
  stroke: rgba(103, 232, 249, 0.32);
  stroke-width: 1.2px;
  stroke-dasharray: 4 6;
  filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.35));
}

.orbit-ring--outer {
  stroke: rgba(129, 140, 248, 0.22);
  stroke-width: 1px;
  stroke-dasharray: 6 9;
  filter: drop-shadow(0 0 8px rgba(129, 140, 248, 0.22));
}

.radar-ping-group {
  pointer-events: none;
}

.radar-ping {
  fill: none;
  stroke: #67e8f9;
  stroke-width: 2px;
  animation: ping-pulse 1.4s ease-out infinite;
}

.radar-ping-core {
  fill: #67e8f9;
  filter: drop-shadow(0 0 10px #67e8f9);
}

@keyframes ping-pulse {
  0% {
    r: 8px;
    opacity: 1;
    stroke-width: 2.5px;
  }
  100% {
    r: 42px;
    opacity: 0;
    stroke-width: 0.5px;
  }
}
</style>