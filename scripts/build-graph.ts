import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { louvain } from '@antv/algorithm';
import { buildDegreeMap, computeBetweenness, pickBackbone } from '../src/utils/topology.ts';
import { computeCelestialMetrics } from '../src/utils/celestial-math.ts';
import { normalizeNoteKey } from '../src/utils/note-lookup.ts';
import { asStringList, extractSummary, parseFrontmatter } from './lib/frontmatter.ts';
import { extractMarkdownDocLinks, extractWikiLinks } from './lib/wiki-links.ts';
import type { CelestialCluster, CelestialEdge, CelestialGraph, CelestialNode, StarRole } from '../src/types/celestial.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const startTime = Date.now();

function readArg(name: string, fallback: string): string {
  const index = args.indexOf('--' + name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

interface NoteRecord {
  id: string;
  title: string;
  summary: string;
  status: string;
  body: string;
  aliases: string[];
  tags: string[];
}

interface DraftEdge {
  source: string;
  target: string;
  weight: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  clusterId: string;
  size: number;
  centerX: number;
  centerY: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight: number;
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function toId(dir: string, file: string): string {
  return relative(dir, file).split(sep).join('/').replace(/\.md$/i, '');
}

const normalizeKey = normalizeNoteKey;

function hash01(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function resolveRole(degree: number, isBridge: boolean, status: string): StarRole {
  if (isBridge) return 'bridge';
  if (status === 'archived' || status === 'archive') return 'archive';
  if (status === 'active') return 'nebula';
  if (degree >= 8) return 'core';
  if (degree <= 1) return 'dust';
  return 'main-sequence';
}

// ---------------------------------------------------------------------------
// 1. 扫描 wiki 目录
// ---------------------------------------------------------------------------

const explicitDir = args.includes('--dir');
const candidates = explicitDir
  ? [resolve(projectRoot, readArg('dir', 'docs/wiki'))]
  : [join(projectRoot, 'docs/wiki'), join(projectRoot, 'wiki'), join(projectRoot, 'scripts/fixtures/wiki')];

const sourceDir = candidates.find((dir) => existsSync(dir) && walk(dir).some((file) => /\.md$/i.test(file)));
if (!sourceDir) {
  console.error('[orbit] 没有找到任何 wiki 目录，可用 --dir 指定：' + candidates.join(' / '));
  process.exit(1);
}
if (!explicitDir && !sourceDir.endsWith('fixtures/wiki')) {
  console.log('[orbit] 读取 wiki 目录：' + relative(projectRoot, sourceDir));
}
if (sourceDir.endsWith('fixtures/wiki')) {
  console.warn('[orbit] docs/wiki 与 wiki 目录为空，使用内置示例数据：' + relative(projectRoot, sourceDir));
}

const markdownFiles = walk(sourceDir).filter((file) => /\.md$/i.test(file));
const notes: NoteRecord[] = markdownFiles.map((file) => {
  const raw = readFileSync(file, 'utf8');
  const parsed = parseFrontmatter(raw);
  const title = typeof parsed.data.title === 'string' && parsed.data.title
    ? parsed.data.title
    : basename(file).replace(/\.md$/i, '');
  const summary = typeof parsed.data.summary === 'string' && parsed.data.summary
    ? parsed.data.summary
    : extractSummary(parsed.body);
  return {
    id: toId(sourceDir, file),
    title,
    summary,
    status: typeof parsed.data.status === 'string' ? parsed.data.status : '',
    body: parsed.body,
    aliases: asStringList(parsed.data.aliases ?? parsed.data.alias),
    tags: asStringList(parsed.data.tags),
  };
});

if (notes.length === 0) {
  console.error('[orbit] 没有找到任何 .md 笔记：' + sourceDir);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. 链接索引与边构建
// ---------------------------------------------------------------------------

const index = {
  path: new Map<string, string | null>(),
  title: new Map<string, string | null>(),
  alias: new Map<string, string | null>(),
  basename: new Map<string, string | null>(),
};

function register(map: Map<string, string | null>, key: string, id: string): void {
  const normalized = normalizeKey(key);
  if (!normalized) return;
  const existing = map.get(normalized);
  if (existing !== undefined && existing !== id) {
    map.set(normalized, null);
    return;
  }
  map.set(normalized, id);
}

for (const note of notes) {
  register(index.path, note.id, note.id);
  register(index.title, note.title, note.id);
  register(index.basename, note.id.split('/').pop() ?? note.id, note.id);
  for (const alias of note.aliases) register(index.alias, alias, note.id);
}

function lookup(map: Map<string, string | null>, key: string): string | undefined {
  const value = map.get(normalizeKey(key));
  return typeof value === 'string' ? value : undefined;
}

function resolveTarget(rawTarget: string): string | undefined {
  const candidates = [rawTarget];
  if (rawTarget.includes('/')) candidates.push(rawTarget.split('/').pop() ?? rawTarget);

  for (const candidate of candidates) {
    const byPath = lookup(index.path, candidate);
    if (byPath) return byPath;
    const byTitle = lookup(index.title, candidate);
    if (byTitle) return byTitle;
    const byAlias = lookup(index.alias, candidate);
    if (byAlias) return byAlias;
    const byBasename = lookup(index.basename, candidate);
    if (byBasename) return byBasename;
  }
  return undefined;
}

const edgeWeights = new Map<string, DraftEdge>();
let unresolvedLinks = 0;

function addEdge(from: string, to: string): void {
  if (from === to) return;
  const first = from < to ? from : to;
  const second = from < to ? to : from;
  const key = first + '\u0000' + second;
  const existing = edgeWeights.get(key);
  if (existing) existing.weight += 1;
  else edgeWeights.set(key, { source: first, target: second, weight: 1 });
}

for (const note of notes) {
  const wikiLinks = extractWikiLinks(note.body).map((link) => link.target);
  const docLinks = extractMarkdownDocLinks(note.body);
  for (const rawTarget of [...wikiLinks, ...docLinks]) {
    const resolved = resolveTarget(rawTarget);
    if (resolved) addEdge(note.id, resolved);
    else unresolvedLinks += 1;
  }
}

const draftEdges = [...edgeWeights.values()].sort((a, b) => {
  if (a.source !== b.source) return a.source.localeCompare(b.source);
  return a.target.localeCompare(b.target);
});

// ---------------------------------------------------------------------------
// 3. 拓扑度量：度数 / 社区 / 介数
// ---------------------------------------------------------------------------

const nodeIds = notes.map((note) => note.id);
const degreeMap = buildDegreeMap(nodeIds, draftEdges);
const betweenness = computeBetweenness(nodeIds, draftEdges);

const backbone = pickBackbone(degreeMap, {
  topRatio: Number(readArg('backbone-ratio', '0.15')),
  minDegree: Number(readArg('min-degree', '3')),
  maxCount: Number(readArg('max-backbone', '260')),
});

const rankedByBetweenness = [...betweenness.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const bridgeBudget = Math.max(1, Math.min(24, Math.round(notes.length * 0.02)));
const bridgeThreshold = rankedByBetweenness[Math.min(bridgeBudget, rankedByBetweenness.length) - 1][1];

const clusterMembership = new Map<string, string>();
if (notes.length > 1) {
  const result = louvain(
    {
      nodes: notes.map((note) => ({ id: note.id })),
      edges: draftEdges.map((edge) => ({ source: edge.source, target: edge.target, weight: edge.weight })),
    },
    false,
    'weight',
  ) as { clusters?: Array<{ id: string; nodes: Array<{ id: string }> }> };

  for (const cluster of result.clusters ?? []) {
    for (const node of cluster.nodes) clusterMembership.set(node.id, 'c' + cluster.id);
  }
}

const clusterIds = [...new Set(notes.map((note) => clusterMembership.get(note.id) ?? 'c0'))].sort();
const clusterLabelSource = new Map<string, { title: string; degree: number }>();
const clusterTags = new Map<string, Map<string, number>>();
for (const note of notes) {
  const clusterId = clusterMembership.get(note.id) ?? 'c0';
  if (!clusterMembership.has(note.id)) clusterMembership.set(note.id, clusterId);
  const degree = degreeMap.get(note.id) ?? 0;
  const current = clusterLabelSource.get(clusterId);
  if (!current || degree > current.degree) clusterLabelSource.set(clusterId, { title: note.title, degree });

  let tags = clusterTags.get(clusterId);
  if (!tags) {
    tags = new Map<string, number>();
    clusterTags.set(clusterId, tags);
  }
  for (const tag of note.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
}

function pickClusterLabel(clusterId: string, claimed: Set<string>): string {
  const tags = clusterTags.get(clusterId);
  const repTitle = clusterLabelSource.get(clusterId)?.title;
  if (tags && tags.size > 0) {
    const ranked = [...tags.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t]) => t);
    for (const tag of ranked) {
      if (!claimed.has(tag) && tag !== '集装箱化') {
        return tag;
      }
    }
  }
  if (repTitle && !claimed.has(repTitle)) {
    return repTitle;
  }
  if (tags?.has('集装箱化') && !claimed.has('集装箱化')) {
    return '集装箱化';
  }
  return repTitle ?? clusterId;
}

const claimedLabels = new Set<string>();
const clusters: CelestialCluster[] = clusterIds.map((id) => {
  let label = pickClusterLabel(id, claimedLabels);
  if (claimedLabels.has(label)) {
    const repTitle = clusterLabelSource.get(id)?.title;
    if (repTitle && !claimedLabels.has(repTitle)) {
      label = repTitle;
    } else {
      let suffix = 2;
      while (claimedLabels.has(label + ' · ' + suffix)) suffix++;
      label = label + ' · ' + suffix;
    }
  }
  claimedLabels.add(label);
  return {
    id,
    label: label.length > 16 ? label.slice(0, 16) + '…' : label,
    nodeCount: notes.filter((note) => (clusterMembership.get(note.id) ?? 'c0') === id).length,
  };
});

// ---------------------------------------------------------------------------
// 4. 构建期力导向布局（客户端冷启动不再跑全图模拟）
// ---------------------------------------------------------------------------

const width = Number(readArg('width', '2000'));
const height = Number(readArg('height', '1200'));
const padding = 140;

const clusterSize = new Map<string, number>();
for (const note of notes) {
  const clusterId = clusterMembership.get(note.id) ?? 'c0';
  clusterSize.set(clusterId, (clusterSize.get(clusterId) ?? 0) + 1);
}

const clusterCenters = new Map<string, { x: number; y: number }>();
const orderedClusters = [...clusterIds].sort((a, b) => (clusterSize.get(b) ?? 0) - (clusterSize.get(a) ?? 0));
orderedClusters.forEach((clusterId, order) => {
  const angle = order * 2.399963229728653;
  const radius = 220 + 150 * Math.sqrt(order);
  clusterCenters.set(clusterId, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
});

const simNodes: SimNode[] = notes.map((note) => {
  const clusterId = clusterMembership.get(note.id) ?? 'c0';
  const center = clusterCenters.get(clusterId) ?? { x: 0, y: 0 };
  const spread = 40 + 14 * Math.sqrt(clusterSize.get(clusterId) ?? 1);
  return {
    id: note.id,
    clusterId,
    size: computeCelestialMetrics(degreeMap.get(note.id) ?? 0).size,
    centerX: center.x,
    centerY: center.y,
    x: center.x + (hash01(note.id + ':x') - 0.5) * spread * 2,
    y: center.y + (hash01(note.id + ':y') - 0.5) * spread * 2,
  };
});

const simLinks: SimLink[] = draftEdges.map((edge) => ({
  source: edge.source,
  target: edge.target,
  weight: edge.weight,
}));

const simulation = forceSimulation<SimNode>(simNodes)
  .force(
    'link',
    forceLink<SimNode, SimLink>(simLinks)
      .id((node) => node.id)
      .distance((link) => Math.max(50, 100 - (link.weight - 1) * 15))
      .strength((link) => Math.min(0.85, 0.25 + link.weight * 0.1)),
  )
  .force('charge', forceManyBody<SimNode>().strength((node) => -(70 + node.size * 3)).distanceMax(900).theta(0.9))
  .force('collide', forceCollide<SimNode>().radius((node) => node.size * 0.75 + 10).strength(0.8).iterations(2))
  .force('x', forceX<SimNode>((node) => node.centerX).strength(0.05))
  .force('y', forceY<SimNode>((node) => node.centerY).strength(0.05))
  .stop();

const ticks = notes.length > 3000 ? 200 : 300;
for (let i = 0; i < ticks; i += 1) simulation.tick();

const xs = simNodes.map((node) => node.x ?? 0);
const ys = simNodes.map((node) => node.y ?? 0);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const spanX = Math.max(1, maxX - minX);
const spanY = Math.max(1, maxY - minY);
const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;

const positionOf = new Map<string, { x: number; y: number }>();
for (const node of simNodes) {
  positionOf.set(node.id, {
    x: Math.round((((node.x ?? 0) - centerX) * scale + width / 2) * 10) / 10,
    y: Math.round((((node.y ?? 0) - centerY) * scale + height / 2) * 10) / 10,
  });
}

// ---------------------------------------------------------------------------
// 5. 输出
// ---------------------------------------------------------------------------

const nodes: CelestialNode[] = notes
  .map((note) => {
    const degree = degreeMap.get(note.id) ?? 0;
    const nodeBetweenness = betweenness.get(note.id) ?? 0;
    const isBridge = nodeBetweenness > 0 && nodeBetweenness >= bridgeThreshold && degree >= 3;
    const position = positionOf.get(note.id) ?? { x: width / 2, y: height / 2 };
    const clusterId = clusterMembership.get(note.id) ?? 'c0';
    return {
      id: note.id,
      title: note.title,
      summary: note.summary,
      clusterId,
      aliases: note.aliases,
      role: resolveRole(degree, isBridge, note.status),
      degree,
      betweenness: Math.round(nodeBetweenness * 100) / 100,
      backbone: backbone.has(note.id),
      notePath: 'wiki/' + note.id + '.md',
      x: position.x,
      y: position.y,
      metrics: computeCelestialMetrics(degree, isBridge),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const clusterOf = new Map(nodes.map((node) => [node.id, node.clusterId]));
const edges: CelestialEdge[] = draftEdges.map((edge) => ({
  id: edge.source + '--' + edge.target,
  source: edge.source,
  target: edge.target,
  weight: edge.weight,
  kind: clusterOf.get(edge.source) === clusterOf.get(edge.target) ? 'orbital' : 'interstellar',
}));

const graph: CelestialGraph = {
  meta: {
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    backboneCount: nodes.filter((node) => node.backbone).length,
    unresolvedLinks,
    orphanCount: nodes.filter((node) => node.degree === 0).length,
  },
  clusters,
  nodes,
  edges,
};

const outPath = resolve(projectRoot, readArg('out', 'public/graph.json'));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(graph));

const notesDir = join(dirname(outPath), 'wiki');
rmSync(notesDir, { recursive: true, force: true });
for (const note of notes) {
  const target = join(notesDir, note.id + '.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, note.body);
}

const elapsed = Date.now() - startTime;
const topNodes = [...nodes].sort((a, b) => b.degree - a.degree).slice(0, 3);
console.log(
  '[orbit] ' + nodes.length + ' nodes / ' + edges.length + ' edges / ' + graph.meta.backboneCount + ' backbone / '
  + clusters.length + ' clusters / ' + unresolvedLinks + ' unresolved / ' + graph.meta.orphanCount + ' orphan'
  + ' (' + elapsed + 'ms)',
);
console.log('[orbit] top: ' + topNodes.map((node) => node.title + '(' + node.degree + ')').join(', '));
console.log('[orbit] source: ' + relative(projectRoot, sourceDir) + ' -> ' + relative(projectRoot, outPath));
