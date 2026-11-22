import { describe, expect, it } from 'vitest';
import {
  createHorizonState,
  edgeKey,
  snapshotHorizon,
  toggleHorizon,
} from './horizon';

const edges = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'c', target: 'd' },
  { source: 'd', target: 'e' },
  { source: 'e', target: 'f' },
];
const backbone = new Set(['a']);

describe('snapshotHorizon', () => {
  it('初始只显示骨干', () => {
    const snapshot = snapshotHorizon(createHorizonState(), edges, backbone);
    expect([...snapshot.nodes.keys()]).toEqual(['a']);
    expect(snapshot.edges.size).toBe(0);
  });

  it('展开后出现 1 阶与 2 阶', () => {
    const state = toggleHorizon(createHorizonState(), 'a', edges, backbone);
    const snapshot = snapshotHorizon(state, edges, backbone);
    expect(snapshot.nodes.get('a')).toBe(0);
    expect(snapshot.nodes.get('b')).toBe(1);
    expect(snapshot.nodes.get('c')).toBe(2);
    expect(snapshot.nodes.has('d')).toBe(false);
    expect(snapshot.edges.get(edgeKey(edges[0]))).toBe(1);
    expect(snapshot.edges.get(edgeKey(edges[1]))).toBe(2);
    expect(snapshot.edges.has(edgeKey(edges[2]))).toBe(false);
  });

  it('累积式：展开第二个焦点不会丢掉第一个星系', () => {
    let state = toggleHorizon(createHorizonState(), 'a', edges, backbone);
    state = toggleHorizon(state, 'c', edges, backbone);
    const snapshot = snapshotHorizon(state, edges, backbone);
    expect(snapshot.nodes.has('b')).toBe(true);
    expect(snapshot.nodes.has('d')).toBe(true);
    expect(snapshot.nodes.get('d')).toBe(1);
  });

  it('展开已可见的星体后，它按焦点（0 阶）呈现', () => {
    let state = toggleHorizon(createHorizonState(), 'a', edges, backbone);
    // c 原本是 a 的 2 阶，展开 c 后成为焦点
    state = toggleHorizon(state, 'c', edges, backbone);
    expect(snapshotHorizon(state, edges, backbone).nodes.get('c')).toBe(0);
  });

  it('收拢焦点只撤销它自己的贡献', () => {
    let state = toggleHorizon(createHorizonState(), 'a', edges, backbone);
    state = toggleHorizon(state, 'e', edges, backbone);
    state = toggleHorizon(state, 'a', edges, backbone);
    const snapshot = snapshotHorizon(state, edges, backbone);
    expect(snapshot.nodes.has('b')).toBe(false);
    expect(snapshot.nodes.get('c')).toBe(2);
    expect(snapshot.nodes.get('e')).toBe(0);
    expect(snapshot.nodes.get('d')).toBe(1);
    expect(snapshot.nodes.get('f')).toBe(1);
  });

  it('全部收拢后回到骨干', () => {
    let state = toggleHorizon(createHorizonState(), 'a', edges, backbone);
    state = toggleHorizon(state, 'a', edges, backbone);
    const snapshot = snapshotHorizon(state, edges, backbone);
    expect([...snapshot.nodes.keys()]).toEqual(['a']);
    expect(snapshot.focus).toBeNull();
  });

  it('焦点状态跟随最近一次展开', () => {
    let state = toggleHorizon(createHorizonState(), 'a', edges, backbone);
    expect(state.focus).toBe('a');
    state = toggleHorizon(state, 'c', edges, backbone);
    expect(state.focus).toBe('c');
  });
});
