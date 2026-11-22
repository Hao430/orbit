// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import GraphToolbar from './GraphToolbar.vue';

describe('GraphToolbar', () => {
  it('四个按钮分别派发缩放、适应与重置事件，第五个按钮切换指南', async () => {
    const wrapper = mount(GraphToolbar);
    const buttons = wrapper.findAll('.graph-toolbar button');
    expect(buttons.length).toBe(5);

    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    await buttons[2].trigger('click');
    await buttons[3].trigger('click');

    expect(wrapper.emitted('zoom-in')).toHaveLength(1);
    expect(wrapper.emitted('zoom-out')).toHaveLength(1);
    expect(wrapper.emitted('fit')).toHaveLength(1);
    expect(wrapper.emitted('reset')).toHaveLength(1);

    expect(wrapper.find('.help-popover').exists()).toBe(false);
    await buttons[4].trigger('click');
    expect(wrapper.find('.help-popover').exists()).toBe(true);
    expect(wrapper.text()).toContain('深空观测指南');
  });
});
