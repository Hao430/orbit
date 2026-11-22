// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeGraph, makeNode } from '@/test-utils/fixtures';
import App from './App.vue';
import NoteDrawer from './components/NoteDrawer.vue';
import OrbitGraph from './components/graph/OrbitGraph.vue';

const jsonResponse = (data: unknown): Response =>
  ({ ok: true, status: 200, json: async () => data }) as unknown as Response;

const webassembly = makeNode({
  id: '语言/WebAssembly',
  title: 'WebAssembly',
  aliases: ['WASM'],
  degree: 4,
  backbone: true,
});
const budget = makeNode({
  id: '工程/性能预算',
  title: '性能预算',
  degree: 4,
  backbone: true,
});
const payload = makeGraph({
  nodes: [webassembly, budget],
  edges: [],
  clusters: [{ id: 'c0', label: '工程', nodeCount: 2 }],
  meta: {
    generatedAt: '2026-01-01T00:00:00.000Z',
    nodeCount: 2,
    edgeCount: 0,
    backboneCount: 2,
    unresolvedLinks: 0,
    orphanCount: 0,
  },
});

// Vue 会把 methods 绑定到实例上，断言要针对原始 spy 而不是 wrapper.vm 上的绑定量
const graphSpies = {
  exploreNode: vi.fn(async () => true),
  resetHorizon: vi.fn(async () => undefined),
  zoomIn: vi.fn(async () => undefined),
  zoomOut: vi.fn(async () => undefined),
  fitView: vi.fn(async () => undefined),
  highlightNode: vi.fn(),
  setFilter: vi.fn(),
};

const orbitGraphStub = defineComponent({
  name: 'OrbitGraph',
  props: { data: { type: Object, required: true } },
  emits: ['select', 'hover', 'hover-end', 'canvas-click', 'stats'],
  template: '<div class="orbit-graph-stub" />',
  methods: graphSpies,
});

const mountApp = () =>
  mount(App, {
    global: {
      stubs: {
        OrbitGraph: orbitGraphStub,
        NoteDrawer: true,
      },
    },
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('App', () => {
  it('先展示加载态，数据就绪后渲染星图与统计', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
    const wrapper = mountApp();

    expect(wrapper.get('.state-layer').text()).toContain('正在校准星图');
    await flushPromises();

    expect(wrapper.find('.state-layer').exists()).toBe(false);
    expect(wrapper.findComponent(OrbitGraph).props('data')).toMatchObject({ meta: payload.meta });
    expect(wrapper.get('.header-updated').text()).toContain('快照');
    expect(wrapper.text()).toContain('天体视界探测仪');
    wrapper.unmount();
  });

  it('星体选中后打开抽屉，点击空白关闭', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
    const wrapper = mountApp();
    await flushPromises();

    const graph = wrapper.findComponent(OrbitGraph);
    graph.vm.$emit('select', { node: webassembly, active: true });
    await flushPromises();
    expect(wrapper.findComponent(NoteDrawer).props('open')).toBe(true);
    expect(wrapper.findComponent(NoteDrawer).props('node')).toMatchObject({ id: webassembly.id });

    graph.vm.$emit('canvas-click');
    await flushPromises();
    expect(wrapper.findComponent(NoteDrawer).props('open')).toBe(false);
    wrapper.unmount();
  });

  it('悬浮事件驱动摘要卡显示与隐藏', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
    const wrapper = mountApp();
    await flushPromises();

    const graph = wrapper.findComponent(OrbitGraph);
    graph.vm.$emit('hover', { node: budget, x: 120, y: 80 });
    await flushPromises();
    expect(wrapper.find('.hover-card').exists()).toBe(true);
    expect(wrapper.get('.hover-card__title').text()).toBe('性能预算');

    graph.vm.$emit('hover-end');
    await flushPromises();
    expect(wrapper.find('.hover-card').exists()).toBe(false);
    wrapper.unmount();
  });

  it('视界统计同步到 HUD，重置按钮同时关闭抽屉', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
    const wrapper = mountApp();
    await flushPromises();

    wrapper.findComponent(OrbitGraph).vm.$emit('stats', {
      visibleNodes: 2,
      visibleEdges: 1,
      centers: 1,
    });
    await flushPromises();
    const stats = wrapper.findAll('.stat-value').map((el) => el.text());
    expect(stats[2]).toBe('1');
    expect(stats[3]).toBe('1');

    wrapper.findComponent(OrbitGraph).vm.$emit('select', { node: budget, active: true });
    await flushPromises();
    await wrapper.get('.reset-button').trigger('click');
    await flushPromises();

    expect(graphSpies.resetHorizon).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent(NoteDrawer).props('open')).toBe(false);
    wrapper.unmount();
  });

  it('工具栏操作转发到图实例', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
    const wrapper = mountApp();
    await flushPromises();

    const buttons = wrapper.findAll('.graph-toolbar button');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    await buttons[2].trigger('click');

    expect(graphSpies.zoomIn).toHaveBeenCalledTimes(1);
    expect(graphSpies.zoomOut).toHaveBeenCalledTimes(1);
    expect(graphSpies.fitView).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('抽屉双链跳到已有笔记时会探索对应星体', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
    const wrapper = mountApp();
    await flushPromises();

    wrapper.findComponent(NoteDrawer).vm.$emit('navigate', 'wasm');
    await flushPromises();

    expect(graphSpies.exploreNode).toHaveBeenCalledWith('语言/WebAssembly');
    wrapper.unmount();
  });

  it('加载失败时可重试恢复', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mountApp();
    await flushPromises();
    expect(wrapper.get('.state-layer--error').text()).toContain('offline');

    await wrapper.get('.state-action').trigger('click');
    await flushPromises();
    expect(wrapper.find('.state-layer').exists()).toBe(false);
    expect(wrapper.text()).toContain('天体视界探测仪');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
