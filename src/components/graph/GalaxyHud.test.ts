// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { CelestialCluster } from '@/types/celestial';
import GalaxyHud from './GalaxyHud.vue';

const clusters: CelestialCluster[] = [
  { id: 'c0', label: '渲染', nodeCount: 8 },
  { id: 'c1', label: '工程', nodeCount: 4 },
];

const mountHud = () =>
  mount(GalaxyHud, {
    props: {
      totalNodes: 12,
      backboneCount: 3,
      visibleNodes: 9,
      visibleEdges: 14,
      centers: 2,
      clusters,
    },
  });

describe('GalaxyHud', () => {
  it('展示视界统计与覆盖率', () => {
    const wrapper = mountHud();
    const stats = wrapper.findAll('.stat-value').map((el) => el.text());
    expect(stats[0]).toBe('3/12');
    expect(stats[1]).toContain('9');
    expect(stats[1]).toContain('75%');
    expect(stats[2]).toBe('14');
    expect(stats[3]).toBe('2');
  });

  it('渲染星团 chips 与六类星体图例', () => {
    const wrapper = mountHud();
    expect(wrapper.findAll('.cluster-chip').length).toBe(2);
    expect(wrapper.text()).toContain('渲染');
    expect(wrapper.findAll('.legend li').length).toBe(6);
  });

  it('点击重置按钮派发事件', async () => {
    const wrapper = mountHud();
    await wrapper.get('.reset-button').trigger('click');
    expect(wrapper.emitted('reset')).toHaveLength(1);
  });

  it('点击星团与谱系派发筛选事件，并支持折叠收起', async () => {
    const wrapper = mountHud();
    const chips = wrapper.findAll('.cluster-chip');
    await chips[0].trigger('click');
    expect(wrapper.emitted('filter-cluster')?.[0]).toEqual(['c0']);
    expect(chips[0].classes()).toContain('is-active');

    const legendItems = wrapper.findAll('.legend li');
    await legendItems[0].trigger('click');
    expect(wrapper.emitted('filter-role')).toHaveLength(1);

    expect(wrapper.find('.galaxy-hud').exists()).toBe(true);
    await wrapper.get('.hud-fold-btn').trigger('click');
    expect(wrapper.find('.hud-pill').exists()).toBe(true);

    await wrapper.get('.hud-pill').trigger('click');
    expect(wrapper.find('.galaxy-hud').exists()).toBe(true);
  });

  it('空图时覆盖率为 0', () => {
    const wrapper = mount(GalaxyHud, {
      props: {
        totalNodes: 0,
        backboneCount: 0,
        visibleNodes: 0,
        visibleEdges: 0,
        centers: 0,
        clusters: [],
      },
    });
    expect(wrapper.findAll('.stat-value')[1].text()).toContain('0%');
  });
});
