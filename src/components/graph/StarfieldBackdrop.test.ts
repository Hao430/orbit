// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StarfieldBackdrop from './StarfieldBackdrop.vue';

function fakeContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('StarfieldBackdrop', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('挂载即绘制星点，按帧循环，卸载时停止', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', cancel);

    const wrapper = mount(StarfieldBackdrop, { attachTo: document.body });

    expect(ctx.setTransform).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();

    callbacks[0]?.(1000);
    expect(ctx.clearRect).toHaveBeenCalled();

    wrapper.unmount();
    expect(cancel).toHaveBeenCalled();
  });
});
