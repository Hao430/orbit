// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeNode } from '@/test-utils/fixtures';
import NoteDrawer from './NoteDrawer.vue';

const textResponse = (text: string, ok = true, status = 200): Response =>
  ({ ok, status, text: async () => text }) as unknown as Response;

const node = makeNode({
  id: '工程/性能预算',
  title: '性能预算',
  notePath: 'wiki/工程/性能预算.md',
  degree: 4,
  betweenness: 13.5,
  backbone: true,
});

const mountDrawer = (open = true) =>
  mount(NoteDrawer, { props: { node, clusterLabel: '工程', open } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NoteDrawer', () => {
  it('打开时加载正文并渲染指标', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('## 体积红线\n\n正文')));
    const wrapper = mountDrawer();
    await flushPromises();

    expect(wrapper.get('.drawer-title').text()).toBe('性能预算');
    expect(wrapper.get('.prose').text()).toContain('体积红线');
    expect(wrapper.text()).toContain('度数4');
    expect(wrapper.classes()).toContain('is-open');
  });

  it('点击双链派发跳转事件', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('见 [[渲染管线|管线]]')));
    const wrapper = mountDrawer();
    await flushPromises();

    const link = wrapper.get('.prose a');
    expect(link.attributes('href')).toContain('#orbit=');
    await link.trigger('click');

    expect(wrapper.emitted('navigate')?.[0]).toEqual(['渲染管线']);
  });

  it('关闭按钮与 Esc 都能关闭抽屉', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('正文')));
    const wrapper = mountDrawer();
    await flushPromises();

    await wrapper.get('.drawer-close').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toHaveLength(2);
    wrapper.unmount();
  });

  it('加载失败时展示错误并可重试', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(textResponse('', false, 500))
      .mockResolvedValueOnce(textResponse('重试成功'));
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mountDrawer();
    await flushPromises();
    expect(wrapper.get('.drawer-state--error').text()).toContain('500');

    await wrapper.get('.retry').trigger('click');
    await flushPromises();
    expect(wrapper.get('.prose').text()).toContain('重试成功');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
