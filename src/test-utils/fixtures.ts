import type { CelestialEdge, CelestialGraph, CelestialNode } from '@/types/celestial';
import { computeCelestialMetrics } from '@/utils/celestial-math';

export type NodeOverrides = Partial<Omit<CelestialNode, 'metrics'>> & {
  metrics?: Partial<CelestialNode['metrics']>;
};

export function makeNode(overrides: NodeOverrides = {}): CelestialNode {
  const id = overrides.id ?? 'note/a';
  const degree = overrides.degree ?? 2;
  const node: CelestialNode = {
    id,
    title: overrides.title ?? 'A 笔记',
    summary: overrides.summary ?? '一段用于测试的摘要。',
    clusterId: overrides.clusterId ?? 'c0',
    aliases: overrides.aliases ?? [],
    role: overrides.role ?? 'main-sequence',
    degree,
    betweenness: overrides.betweenness ?? 0,
    backbone: overrides.backbone ?? false,
    notePath: overrides.notePath ?? 'wiki/' + id + '.md',
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    metrics: computeCelestialMetrics(degree, overrides.metrics?.isBridge ?? false),
  };
  if (overrides.metrics) node.metrics = { ...node.metrics, ...overrides.metrics, degree };
  return node;
}

export function makeGraph(overrides: Partial<CelestialGraph> = {}): CelestialGraph {
  const nodes = overrides.nodes ?? [makeNode()];
  const edges = overrides.edges ?? [];
  return {
    meta: overrides.meta ?? {
      generatedAt: '2026-01-01T00:00:00.000Z',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      backboneCount: nodes.filter((node) => node.backbone).length,
      unresolvedLinks: 0,
      orphanCount: nodes.filter((node) => node.degree === 0).length,
    },
    clusters: overrides.clusters ?? [{ id: 'c0', label: '测试星团', nodeCount: nodes.length }],
    nodes,
    edges,
  };
}

export function makeEdge(overrides: Partial<CelestialEdge> = {}): CelestialEdge {
  const source = overrides.source ?? 'note/a';
  const target = overrides.target ?? 'note/b';
  return {
    id: overrides.id ?? (source < target ? source + '--' + target : target + '--' + source),
    source,
    target,
    weight: overrides.weight ?? 1,
    kind: overrides.kind ?? 'orbital',
  };
}
