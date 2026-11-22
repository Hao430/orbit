import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { CelestialGraph } from '../src/types/celestial';

const workDir = mkdtempSync(join(tmpdir(), 'orbit-build-'));
const fixtureDir = resolve(process.cwd(), 'scripts/fixtures/wiki');

function build(outName: string): CelestialGraph {
  const out = join(workDir, outName);
  execFileSync(
    process.execPath,
    [
      'scripts/build-graph.ts',
      '--dir',
      fixtureDir,
      '--out',
      out,
      '--width',
      '800',
      '--height',
      '600',
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  return JSON.parse(readFileSync(out, 'utf8')) as CelestialGraph;
}

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('build-graph 端到端', () => {
  const graph = build('graph.json');

  it('统计数量与拓扑度量', () => {
    expect(graph.meta.nodeCount).toBe(12);
    expect(graph.meta.edgeCount).toBe(14);
    expect(graph.meta.backboneCount).toBe(3);
    expect(graph.meta.unresolvedLinks).toBe(1);
    expect(graph.meta.orphanCount).toBe(1);
    expect(graph.clusters).toHaveLength(3);
  });

  it('识别桥梁、归档与孤立笔记', () => {
    const bridge = graph.nodes.find((node) => node.id === '渲染/浏览器渲染管线');
    expect(bridge?.role).toBe('bridge');
    expect(bridge?.backbone).toBe(true);
    expect(bridge?.metrics.isBridge).toBe(true);

    const archived = graph.nodes.find((node) => node.id === '笔记/读书笔记');
    expect(archived?.role).toBe('archive');
    expect(archived?.degree).toBe(0);
    expect(archived?.backbone).toBe(false);

    const orphan = graph.nodes.find((node) => node.id === '笔记/读书笔记');
    expect(orphan?.summary).toContain('高性能浏览器网络');
  });

  it('保留别名、正文路径与可见星团标签', () => {
    const rust = graph.nodes.find((node) => node.id === '语言/Rust与WASM');
    expect(rust?.aliases).toEqual(['wasm入门', 'Rust']);
    expect(rust?.notePath).toBe('wiki/语言/Rust与WASM.md');

    const labels = graph.clusters.map((cluster) => cluster.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('坐标落在构建指定的画布范围内', () => {
    for (const node of graph.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(800);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(600);
    }
  });

  it('边有稳定 id 且区分本地星轨与跨星系星流', () => {
    for (const edge of graph.edges) {
      const sorted = edge.source < edge.target;
      expect(edge.id).toBe(sorted ? edge.source + '--' + edge.target : edge.target + '--' + edge.source);
      expect(['orbital', 'interstellar']).toContain(edge.kind);
      expect(edge.weight).toBeGreaterThan(0);
    }
    expect(graph.edges.some((edge) => edge.kind === 'interstellar')).toBe(true);
  });

  it('正文被复制到 public/wiki 且去掉了 frontmatter', () => {
    const noteFile = join(workDir, 'wiki/语言/WebAssembly.md');
    expect(existsSync(noteFile)).toBe(true);
    const body = readFileSync(noteFile, 'utf8');
    expect(body.startsWith('---')).toBe(false);
    expect(body).toContain('WebAssembly');
  });

  it('相同输入两次构建结果确定', () => {
    const again = build('graph-again.json');
    expect(again.nodes).toEqual(graph.nodes);
    expect(again.edges).toEqual(graph.edges);
    expect(again.clusters).toEqual(graph.clusters);
  });
});
