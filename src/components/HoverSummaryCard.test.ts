// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { makeNode } from '@/test-utils/fixtures';
import HoverSummaryCard from './HoverSummaryCard.vue';

const mountCard = (x: number, y: number, overrides = {}) =>
  mount(HoverSummaryCard, {
    props: {
      node: makeNode({ role: 'bridge', degree: 5, ...overrides }),
      clusterLabel: '渲染',
      x,
      y,
    },
  });

describe('HoverSummaryCard', () => {
  it('展示标题、摘要与角色', () => {
    const wrapper = mountCard(100, 100);
    expect(wrapper.get('.hover-card__title').text()).toBe('A 笔记');
    expect(wrapper.get('.hover-card__summary').text()).toContain('摘要');
    expect(wrapper.get('.hover-card__role').text()).toBe('虫洞枢纽');
    expect(wrapper.text()).toContain('度数 5');
  });

  it('靠近右下角时自动收进视口', () => {
    const wrapper = mountCard(1000, 800);
    const style = wrapper.get('.hover-card').attributes('style') ?? '';
    expect(style).toContain('left: 688px');
    expect(style).toContain('top: 566px');
  });

  it('没有摘要时给出兜底文案', () => {
    const wrapper = mountCard(100, 100, { summary: '' });
    expect(wrapper.get('.hover-card__summary').text()).toContain('还没有摘要');
  });
});
