import { describe, expect, it } from 'vitest';
import { createStars, starAlpha, starCount } from './starfield';

describe('starfield', () => {
  it('星点数量随面积增长且有上下限', () => {
    expect(starCount(1, 1)).toBe(48);
    expect(starCount(1920, 1080)).toBe(173);
    expect(starCount(7680, 4320)).toBe(180);
  });

  it('同 seed 生成相同布局，且星点落在视口内', () => {
    const a = createStars(1280, 720, 42);
    const b = createStars(1280, 720, 42);
    expect(a).toEqual(b);
    expect(a).toHaveLength(starCount(1280, 720));
    for (const star of a) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(1280);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(720);
      expect(star.radius).toBeGreaterThan(0);
    }
  });

  it('alpha 随时间在 0..1 之间呼吸', () => {
    const [star] = createStars(800, 600, 7);
    for (const ms of [0, 500, 1500, 4000, 10_000]) {
      const alpha = starAlpha(star, ms);
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
    const samples = new Set([0, 800, 1600, 2400].map((ms) => starAlpha(star, ms).toFixed(3)));
    expect(samples.size).toBeGreaterThan(1);
  });
});
