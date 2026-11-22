import { describe, expect, it } from 'vitest';
import { makeNode } from '@/test-utils/fixtures';
import { ROLE_TONES } from './palette';
import { edgeStyle, nodeSize, nodeStyle } from './graph-visual';

describe('nodeSize', () => {
  const node = makeNode({ degree: 7 });

  it('骨干 / 焦点保持完整尺寸', () => {
    expect(nodeSize(node, 0)).toBe(node.metrics.size);
  });

  it('1 阶 65%，2 阶 40%', () => {
    expect(nodeSize(node, 1)).toBeCloseTo(node.metrics.size * 0.65, 5);
    expect(nodeSize(node, 2)).toBeCloseTo(node.metrics.size * 0.4, 5);
  });

  it('极小星尘有渲染下限', () => {
    const dust = makeNode({ degree: 1, role: 'dust' });
    expect(nodeSize(dust, 2)).toBe(7);
  });
});

describe('nodeStyle', () => {
  it('用角色色填充并开启光晕', () => {
    const node = makeNode({ role: 'bridge', degree: 5 });
    const style = nodeStyle(node, 0);
    expect(style.fill).toBe(ROLE_TONES.bridge.core);
    expect(style.halo).toBe(true);
    expect(style.haloStroke).toBe(ROLE_TONES.bridge.core);
    expect(style.label).toBe(true);
    expect(style.labelText).toBe(node.title);
  });

  it('2 阶微尘不显示标签，光晕减半', () => {
    const node = makeNode({ degree: 6 });
    const style = nodeStyle(node, 2);
    expect(style.label).toBe(false);
    expect(style.haloOpacity).toBeCloseTo(node.metrics.haloAlpha * 0.55, 5);
  });

  it('不改动传入节点', () => {
    const node = makeNode();
    const snapshot = JSON.stringify(node);
    nodeStyle(node, 1);
    expect(JSON.stringify(node)).toBe(snapshot);
  });
});

describe('edgeStyle', () => {
  it('骨干航道最亮，2 阶最弱', () => {
    const backbone = edgeStyle(0);
    const hop1 = edgeStyle(1);
    const hop2 = edgeStyle(2);
    expect(backbone.lineWidth).toBe(1.4);
    expect(hop1.lineWidth).toBe(1);
    expect(hop2.lineWidth).toBe(0.8);
    expect(String(hop2.stroke)).toContain('0.11');
    expect(String(hop1.stroke)).toContain('0.26');
  });

  it('所有边都不画箭头', () => {
    expect(edgeStyle(0).endArrow).toBe(false);
    expect(edgeStyle(1).endArrow).toBe(false);
    expect(edgeStyle(2).endArrow).toBe(false);
  });
});
