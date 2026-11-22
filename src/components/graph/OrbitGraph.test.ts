// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEdge, makeGraph, makeNode } from '@/test-utils/fixtures';
import type { CelestialEdge, CelestialNode } from '@/types/celestial';

interface MockNodeRecord {
  id: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

class MockGraph {
  static graphs: MockGraph[] = [];

  data: { nodes: MockNodeRecord[]; edges: MockEdgeRecord[] } = { nodes: [], edges: [] };
  handlers = new Map<string, Array<(event: unknown) => void>>();
  pluginUpdates: Array<Record<string, unknown>> = [];
  focusCalls: string[] = [];
  zoomRatios: number[] = [];
  fitCalls = 0;
  destroys = 0;

  constructor(options: { data?: { nodes?: MockNodeRecord[]; edges?: MockEdgeRecord[] } }) {
    this.data = {
      nodes: (options.data?.nodes ?? []).map((node) => ({ ...node, style: { ...node.style } })),
      edges: (options.data?.edges ?? []).map((edge) => ({ ...edge, style: { ...edge.style } })),
    };
    MockGraph.graphs.push(this);
  }

  on(event: string, callback: (payload: unknown) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(callback);
    this.handlers.set(event, list);
  }

  emit(event: string, payload: unknown): void {
    for (const callback of this.handlers.get(event) ?? []) callback(payload);
  }

  async render(): Promise<void> {}
  async draw(): Promise<void> {}

  async fitView(): Promise<void> {
    this.fitCalls += 1;
  }

  async focusElement(id: string): Promise<void> {
    this.focusCalls.push(id);
  }

  async zoomBy(ratio: number): Promise<void> {
    this.zoomRatios.push(ratio);
  }

  addNodeData(nodes: MockNodeRecord[]): void {
    for (const node of nodes) {
      const index = this.data.nodes.findIndex((item) => item.id === node.id);
      if (index >= 0) this.data.nodes[index] = { ...this.data.nodes[index], ...node };
      else this.data.nodes.push(node);
    }
  }

  updateNodeData(nodes: Array<{ id: string; style?: Record<string, unknown> }>): void {
    for (const node of nodes) {
      const target = this.data.nodes.find((item) => item.id === node.id);
      if (target) target.style = { ...target.style, ...node.style };
    }
  }

  removeNodeData(ids: string[]): void {
    this.data.nodes = this.data.nodes.filter((node) => !ids.includes(node.id));
  }

  addEdgeData(edges: MockEdgeRecord[]): void {
    for (const edge of edges) {
      if (!this.data.edges.some((item) => item.id === edge.id)) this.data.edges.push(edge);
    }
  }

  updateEdgeData(edges: Array<{ id: string; style?: Record<string, unknown> }>): void {
    for (const edge of edges) {
      const target = this.data.edges.find((item) => item.id === edge.id);
      if (target) target.style = { ...target.style, ...edge.style };
    }
  }

  removeEdgeData(ids: string[]): void {
    this.data.edges = this.data.edges.filter((edge) => !ids.includes(edge.id));
  }

  updatePlugin(options: Record<string, unknown>): void {
    this.pluginUpdates.push(options);
  }

  destroy(): void {
    this.destroys += 1;
  }
}

interface MockEdgeRecord {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

vi.mock('@antv/g6', () => ({
  Graph: MockGraph,
  NodeEvent: {
    CLICK: 'node:click',
    POINTER_OVER: 'node:pointerover',
    POINTER_OUT: 'node:pointerout',
  },
  CanvasEvent: { CLICK: 'canvas:click' },
}));

const { default: OrbitGraph } = await import('./OrbitGraph.vue');

const nodes: CelestialNode[] = [
  makeNode({ id: 'a', title: '中心星', degree: 4, backbone: true }),
  makeNode({ id: 'b', title: '骨干伴星', degree: 3, backbone: true }),
  makeNode({ id: 'c', title: '一阶卫星', degree: 2 }),
  makeNode({ id: 'd', title: '另一颗卫星', degree: 2 }),
  makeNode({ id: 'e', title: '二阶微尘', degree: 2 }),
];
const edges: CelestialEdge[] = [
  makeEdge({ source: 'a', target: 'b' }),
  makeEdge({ source: 'a', target: 'c' }),
  makeEdge({ source: 'a', target: 'd' }),
  makeEdge({ source: 'c', target: 'e' }),
];
const graphData = makeGraph({ nodes, edges });

const latestGraph = (): MockGraph => {
  const instance = MockGraph.graphs[MockGraph.graphs.length - 1];
  if (!instance) throw new Error('graph not created');
  return instance;
};

const mountGraph = async () => {
  const wrapper = mount(OrbitGraph, { props: { data: graphData } });
  await flushPromises();
  return { wrapper, graph: latestGraph() };
};

beforeEach(() => {
  MockGraph.graphs = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OrbitGraph', () => {
  it('冷启动只渲染骨干节点与骨干连线', async () => {
    const { wrapper, graph } = await mountGraph();
    expect(graph.data.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);
    expect(graph.data.edges.map((edge) => edge.id)).toEqual(['a--b']);
    expect(graph.fitCalls).toBe(1);
    expect(wrapper.emitted('stats')?.[0]?.[0]).toMatchObject({ visibleNodes: 2, visibleEdges: 1 });
    wrapper.unmount();
  });

  it('点击星体展开 1 阶并延迟点亮 2 阶', async () => {
    const { wrapper, graph } = await mountGraph();
    graph.emit('node:click', { target: { id: 'a' }, client: { x: 0, y: 0 } });
    await flushPromises();
    expect(graph.data.nodes.map((node) => node.id).sort()).toEqual(['a', 'b', 'c', 'd']);

    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(graph.data.nodes.map((node) => node.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);

    const select = wrapper.emitted('select')?.at(-1)?.[0] as { node: CelestialNode; active: boolean };
    expect(select.node.id).toBe('a');
    expect(select.active).toBe(true);
    expect(graph.focusCalls).toContain('a');
    wrapper.unmount();
  });

  it('再次点击焦点只收拢该焦点，并派发关闭信号', async () => {
    const { wrapper, graph } = await mountGraph();
    graph.emit('node:click', { target: { id: 'a' }, client: { x: 0, y: 0 } });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    graph.emit('node:click', { target: { id: 'a' }, client: { x: 0, y: 0 } });
    await flushPromises();

    expect(graph.data.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);
    const select = wrapper.emitted('select')?.at(-1)?.[0] as { active: boolean };
    expect(select.active).toBe(false);
    wrapper.unmount();
  });

  it('悬停 280ms 后才派发摘要事件', async () => {
    const { wrapper, graph } = await mountGraph();
    graph.emit('node:pointerover', { target: { id: 'a' }, client: { x: 12, y: 24 } });
    await vi.advanceTimersByTimeAsync(200);
    expect(wrapper.emitted('hover')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(100);
    const hover = wrapper.emitted('hover')?.[0]?.[0] as { node: CelestialNode; x: number; y: number };
    expect(hover.node.id).toBe('a');
    expect(hover.x).toBe(12);

    graph.emit('node:pointerout', { target: { id: 'a' }, client: { x: 0, y: 0 } });
    expect(wrapper.emitted('hover-end')).toHaveLength(1);
    wrapper.unmount();
  });

  it('从抽屉跳转到未点亮的笔记时会将其设为焦点', async () => {
    const { wrapper, graph } = await mountGraph();
    const exposed = wrapper.vm as unknown as { exploreNode: (id: string) => Promise<boolean> };
    const found = await exposed.exploreNode('d');
    await flushPromises();

    expect(found).toBe(true);
    expect(graph.data.nodes.map((node) => node.id)).toContain('d');
    const select = wrapper.emitted('select')?.at(-1)?.[0] as { node: CelestialNode };
    expect(select.node.id).toBe('d');
    wrapper.unmount();
  });

  it('重置视界回到骨干并更新星团轮廓', async () => {
    const { wrapper, graph } = await mountGraph();
    graph.emit('node:click', { target: { id: 'a' }, client: { x: 0, y: 0 } });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    expect(graph.pluginUpdates.length).toBeGreaterThan(0);

    const exposed = wrapper.vm as unknown as {
      resetHorizon: () => Promise<void>;
      zoomIn: () => Promise<void>;
      zoomOut: () => Promise<void>;
      fitView: () => Promise<void>;
    };
    await exposed.resetHorizon();
    await flushPromises();
    expect(graph.data.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);

    await exposed.zoomIn();
    await exposed.zoomOut();
    await exposed.fitView();
    expect(graph.zoomRatios).toEqual([1.2, 0.8]);
    expect(graph.fitCalls).toBe(3);
    wrapper.unmount();
  });

  it('画布空白点击与卸载都会正确清理', async () => {
    const { wrapper, graph } = await mountGraph();
    graph.emit('canvas:click', {});
    expect(wrapper.emitted('canvas-click')).toHaveLength(1);

    wrapper.unmount();
    expect(graph.destroys).toBe(1);
  });
});
