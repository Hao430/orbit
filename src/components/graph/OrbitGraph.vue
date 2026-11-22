<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  CanvasEvent,
  Graph,
  NodeEvent,
  type CustomPluginOption,
  type EdgeData,
  type GraphData,
  type IElementEvent,
  type NodeData,
} from '@antv/g6';
import type { CelestialEdge, CelestialGraph, CelestialNode } from '@/types/celestial';
import { clusterHue, roleTone, withAlpha } from '@/utils/palette';
import {
  createHorizonState,
  snapshotHorizon,
  toggleHorizon,
  type HorizonSnapshot,
  type HorizonState,
} from '@/utils/horizon';

type Hop = 0 | 1 | 2;

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

const ORIGIN = { x: 1000, y: 600 };
const HOP2_DELAY = 160;
const HOVER_DELAY = 280;

function nodeSize(node: CelestialNode, hop: Hop): number {
  if (hop === 0) return node.metrics.size;
  const scale = hop === 1 ? 0.72 : 0.5;
  return Math.max(7, node.metrics.size * scale);
}

function nodeStyle(node: CelestialNode, hop: Hop): Record<string, unknown> {
  const tone = roleTone(node.role);
  const size = nodeSize(node, hop);
  return {
    x: node.x,
    y: node.y,
    size,
    fill: tone.core,
    stroke: hop === 0 ? 'rgba(248, 250, 252, 0.35)' : 'rgba(226, 232, 240, 0.18)',
    lineWidth: hop === 0 ? 1.2 : 1,
    halo: true,
    haloStroke: tone.core,
    haloLineWidth: Math.max(6, size * 0.6),
    haloOpacity: Math.min(0.8, node.metrics.haloAlpha * (hop === 2 ? 0.55 : 1)),
    label: hop !== 2,
    labelText: node.title,
    labelFill: hop === 0 ? 'rgba(226, 232, 240, 0.92)' : 'rgba(148, 163, 184, 0.8)',
    labelFontSize: hop === 0 ? 11 : 10,
    labelFontWeight: hop === 0 ? 500 : 400,
    labelPlacement: 'bottom',
    labelOffsetY: 7,
    labelMaxWidth: 150,
    opacity: 1,
    cursor: 'pointer',
  };
}

function edgeStyle(hop: Hop): Record<string, unknown> {
  if (hop === 0) {
    return {
      stroke: 'rgba(129, 140, 248, 0.38)',
      lineWidth: 1.4,
      strokeOpacity: 1,
      opacity: 1,
      endArrow: false,
      lineAppendWidth: 4,
    };
  }
  return {
    stroke: hop === 1 ? 'rgba(148, 163, 184, 0.26)' : 'rgba(148, 163, 184, 0.11)',
    lineWidth: hop === 1 ? 1 : 0.8,
    strokeOpacity: 1,
    opacity: 1,
    endArrow: false,
    lineAppendWidth: 4,
  };
}

function toNodeData(node: CelestialNode, hop: Hop, origin?: { x: number; y: number }): NodeData {
  const style = nodeStyle(node, hop);
  if (origin) {
    style.x = origin.x;
    style.y = origin.y;
    style.opacity = 0;
  }
  return { id: node.id, data: { hop }, style: style as NodeData['style'] };
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
const hullClusters = props.data.clusters
  .filter((cluster) => cluster.nodeCount >= HULL_MIN_NODES)
  .slice(0, HULL_MAX_CLUSTERS);

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

const CLUSTER_FALLBACK = '#38bdf8';

function updateHulls(): void {
  if (!graphInstance) return;
  for (const cluster of hullClusters) {
    const members = [...shownHops.keys()].filter((id) => nodeById.get(id)?.clusterId === cluster.id);
    graphInstance.updatePlugin({
      key: 'hull-' + cluster.id,
      members: members.length >= 3 ? members : [],
    });
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
  const token = ++applyToken;

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
      });
    }, HOP2_DELAY);
  } else if (delayed.length > 0) {
    await addBatch(delayed, addedEdges, false);
  }

  updateHulls();
  emitStats();
}

async function handleNodeClick(event: IElementEvent): Promise<void> {
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
  graph.on(NodeEvent.CLICK, (event: IElementEvent) => {
    void handleNodeClick(event);
  });

  graph.on(CanvasEvent.CLICK, () => {
    emit('canvas-click');
  });

  graph.on(NodeEvent.POINTER_OVER, (event: IElementEvent) => {
    const id = event.target?.id;
    if (!id) return;
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
      { type: 'zoom-canvas', sensitivity: 1.15 },
      { type: 'hover-activate', degree: 1, state: 'active', inactiveState: 'inactive' },
      { type: 'auto-adapt-label', sortNode: { type: 'degree' }, padding: 8 },
      'optimize-viewport-transform',
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
  clearRevealTimer();
  clearHoverTimer();
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
  await graphInstance?.fitView();
}

async function resetHorizon(): Promise<void> {
  clearRevealTimer();
  horizon = createHorizonState();
  await applySnapshot(snapshotHorizon(horizon, props.data.edges, backbone), false);
  emit('select', { node: null, active: false });
  await graphInstance?.fitView();
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
  return true;
}

defineExpose({ zoomIn, zoomOut, fitView, resetHorizon, exploreNode });
</script>

<template>
  <div ref="containerRef" class="orbit-graph" />
</template>

<style scoped>
.orbit-graph {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 22%, rgba(56, 189, 248, 0.07), transparent 42%),
    radial-gradient(circle at 78% 72%, rgba(168, 85, 247, 0.08), transparent 48%),
    radial-gradient(circle at 55% 45%, rgba(52, 211, 153, 0.04), transparent 55%),
    var(--space-void);
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
}
</style>
