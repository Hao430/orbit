import { describe, expect, it } from 'vitest';
import { CLUSTER_HUES, ROLE_TONES, clusterHue, roleTone, withAlpha } from './palette';

describe('withAlpha', () => {
  it('把十六进制转成 rgba', () => {
    expect(withAlpha('#38bdf8', 0.5)).toBe('rgba(56, 189, 248, 0.5)');
    expect(withAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
  });
});

describe('clusterHue', () => {
  it('按调色板循环取色', () => {
    expect(clusterHue(0)).toBe(CLUSTER_HUES[0]);
    expect(clusterHue(CLUSTER_HUES.length)).toBe(CLUSTER_HUES[0]);
    expect(clusterHue(1)).toBe(CLUSTER_HUES[1]);
  });

  it('对负数也安全', () => {
    expect(clusterHue(-1)).toBe(CLUSTER_HUES[CLUSTER_HUES.length - 1]);
  });
});

describe('roleTone', () => {
  it('六种星体角色都有完整定义', () => {
    const roles = ['core', 'main-sequence', 'nebula', 'archive', 'bridge', 'dust'] as const;
    for (const role of roles) {
      expect(roleTone(role)).toBe(ROLE_TONES[role]);
      expect(roleTone(role).core).toMatch(/^#[0-9a-f]{6}$/);
      expect(roleTone(role).label.length).toBeGreaterThan(0);
    }
  });
});
