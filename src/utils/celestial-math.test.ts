import { describe, expect, it } from 'vitest';
import {
  HOP_SIZE_SCALE,
  clamp,
  computeCelestialMetrics,
  computeHaloAlpha,
  computeMass,
  computeNodeSize,
  scaleSizeByHop,
} from './celestial-math';

describe('computeNodeSize', () => {
  it('把 0 度节点压到最小尺寸', () => {
    expect(computeNodeSize(0)).toBe(12);
  });

  it('按 log2 增长', () => {
    expect(computeNodeSize(1)).toBe(16);
    expect(computeNodeSize(3)).toBe(32);
    expect(computeNodeSize(7)).toBe(48);
  });

  it('封顶 60，不会无限膨胀', () => {
    expect(computeNodeSize(100)).toBe(60);
    expect(computeNodeSize(10_000)).toBe(60);
  });

  it('对负数是安全的', () => {
    expect(computeNodeSize(-5)).toBe(12);
  });

  it('单调不减', () => {
    let previous = 0;
    for (let degree = 0; degree <= 200; degree += 1) {
      const size = computeNodeSize(degree);
      expect(size).toBeGreaterThanOrEqual(previous);
      previous = size;
    }
  });
});

describe('computeHaloAlpha', () => {
  it('符合 0.15 + k * 0.05 并在 0.8 封顶', () => {
    expect(computeHaloAlpha(0)).toBe(0.15);
    expect(computeHaloAlpha(1)).toBeCloseTo(0.2, 5);
    expect(computeHaloAlpha(6)).toBeCloseTo(0.45, 5);
    expect(computeHaloAlpha(100)).toBe(0.8);
  });
});

describe('computeMass', () => {
  it('始终为正，并随度数平方根增长', () => {
    expect(computeMass(0)).toBe(2);
    expect(computeMass(3)).toBe(4);
    expect(computeMass(8)).toBe(6);
  });
});

describe('computeCelestialMetrics', () => {
  it('一次产出完整度量', () => {
    expect(computeCelestialMetrics(3, true)).toEqual({
      degree: 3,
      size: 32,
      haloAlpha: 0.3,
      mass: 4,
      isBridge: true,
    });
  });
});

describe('视界尺寸衰减', () => {
  it('1 阶 65%，2 阶 40%', () => {
    expect(scaleSizeByHop(40, 1)).toBeCloseTo(26, 5);
    expect(scaleSizeByHop(40, 2)).toBeCloseTo(16, 5);
    expect(HOP_SIZE_SCALE[2]).toBe(0.4);
  });
});

describe('clamp', () => {
  it('夹取到区间内', () => {
    expect(clamp(1, 5, 0)).toBe(1);
    expect(clamp(1, 5, 3)).toBe(3);
    expect(clamp(1, 5, 9)).toBe(5);
  });
});
