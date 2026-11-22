import { describe, expect, it } from 'vitest';
import {
  buildDegreeMap,
  computeBetweenness,
  computeTwoHopNeighborhood,
  pickBackbone,
} from './topology';

const path4 = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'c', target: 'd' },
];

describe('buildDegreeMap', () => {
  it('无向计数，重复边累加，自环忽略', () => {
    const degree = buildDegreeMap(['a', 'b', 'c'], [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'c' },
    ]);
    expect(degree.get('a')).toBe(2);
    expect(degree.get('b')).toBe(3);
    expect(degree.get('c')).toBe(1);
  });
});

describe('pickBackbone', () => {
  const degree = new Map([
    ['a', 10],
    ['b', 5],
    ['c', 3],
    ['d', 2],
    ['e', 1],
  ]);

  it('取前 40% 且不低于度数下限', () => {
    expect([...pickBackbone(degree, { topRatio: 0.4, minDegree: 3 })].sort()).toEqual(['a', 'b', 'c']);
  });

  it('minDegree 提高时会收紧', () => {
    expect([...pickBackbone(degree, { topRatio: 0.4, minDegree: 6 })]).toEqual(['a']);
  });

  it('maxCount 兜底，且结果稳定排序', () => {
    expect([...pickBackbone(degree, { topRatio: 1, minDegree: 1, maxCount: 2 })]).toEqual(['a', 'b']);
  });

  it('空图返回空集合', () => {
    expect(pickBackbone(new Map()).size).toBe(0);
  });
});

describe('computeTwoHopNeighborhood', () => {
  it('链式结构分出 1 阶与 2 阶', () => {
    const result = computeTwoHopNeighborhood('b', path4);
    expect(result.hop1).toEqual(['a', 'c']);
    expect(result.hop2).toEqual(['d']);
    expect(result.edges.map((e) => `${e.source}-${e.target}:${e.hop}`).sort()).toEqual([
      'a-b:1',
      'b-c:1',
      'c-d:2',
    ]);
  });

  it('三角环全部是 1 阶，没有 2 阶', () => {
    const result = computeTwoHopNeighborhood('a', [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ]);
    expect(result.hop1).toEqual(['b', 'c']);
    expect(result.hop2).toEqual([]);
  });

  it('不会把母星算进 2 阶', () => {
    const result = computeTwoHopNeighborhood('a', path4);
    expect(result.hop2).not.toContain('a');
  });

  it('孤立节点返回空邻域', () => {
    expect(computeTwoHopNeighborhood('z', path4)).toEqual({ hop1: [], hop2: [], edges: [] });
  });
});

describe('computeBetweenness', () => {
  it('链式图两端为 0，中间节点各承担两对', () => {
    const result = computeBetweenness(['a', 'b', 'c', 'd'], path4);
    expect(result.get('a')).toBe(0);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(2);
    expect(result.get('d')).toBe(0);
  });

  it('星型图中心承担所有叶子对', () => {
    const result = computeBetweenness(['hub', 'x', 'y', 'z'], [
      { source: 'hub', target: 'x' },
      { source: 'hub', target: 'y' },
      { source: 'hub', target: 'z' },
    ]);
    expect(result.get('hub')).toBe(3);
    expect(result.get('x')).toBe(0);
  });

  it('三角环所有节点为 0（都有直连）', () => {
    const result = computeBetweenness(['a', 'b', 'c'], [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ]);
    expect([...result.values()]).toEqual([0, 0, 0]);
  });

  it('结果不依赖边的方向', () => {
    const forward = computeBetweenness(['a', 'b', 'c'], [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ]);
    const backward = computeBetweenness(['a', 'b', 'c'], [
      { source: 'b', target: 'a' },
      { source: 'c', target: 'b' },
    ]);
    expect(forward.get('b')).toBe(backward.get('b'));
  });
});
