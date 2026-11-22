/**
 * 无状态图拓扑纯函数。
 *
 * 这些函数同时服务于构建期预计算与运行时视界展开，
 * 因此不允许依赖 Vue / G6 / DOM。
 */

export interface TopologyEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface BackboneOptions {
  /** 按度数降序保留的比例，默认 15% */
  topRatio?: number;
  /** 骨干硬下限，避免长尾图截出大量 degree=1 节点 */
  minDegree?: number;
  /** 骨干数量上限，保证冷启动画面干净 */
  maxCount?: number;
}

export interface HopEdge {
  source: string;
  target: string;
  hop: 1 | 2;
}

export interface HopNeighborhood {
  hop1: string[];
  hop2: string[];
  edges: HopEdge[];
}

/** 无向图度数：同一条边对两端各计一次，重复边按次数累加 */
export function buildDegreeMap(
  nodeIds: readonly string[],
  edges: readonly TopologyEdge[],
): Map<string, number> {
  const degreeMap = new Map<string, number>();
  for (const id of nodeIds) degreeMap.set(id, 0);
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (degreeMap.has(edge.source)) degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    if (degreeMap.has(edge.target)) degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  }
  return degreeMap;
}

/**
 * 抽取宏观骨干星系：度数降序，取前 topRatio，且不低于 minDegree，
 * 最后用 maxCount 兜底。结果按 id 排序，保证构建产物稳定。
 */
export function pickBackbone(
  degreeMap: ReadonlyMap<string, number>,
  options: BackboneOptions = {},
): Set<string> {
  const { topRatio = 0.15, minDegree = 3, maxCount = 260 } = options;
  const entries = [...degreeMap.entries()].filter(([, degree]) => degree > 0);
  if (entries.length === 0) return new Set();

  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const cutoffIndex = Math.min(entries.length - 1, Math.floor(entries.length * topRatio));
  const cutoff = Math.max(minDegree, entries[cutoffIndex][1]);

  const selected = entries
    .filter(([, degree]) => degree >= cutoff)
    .slice(0, maxCount)
    .map(([id]) => id)
    .sort();

  return new Set(selected);
}

/**
 * 以 centerId 为中心计算 1 阶与 2 阶邻域（无向），并给出需要点亮的边。
 * 相比文档里的两趟遍历，这里用 BFS 计算真实距离，天然去重且不会把
 * 母星误判进 2 阶。
 */
export function computeTwoHopNeighborhood(
  centerId: string,
  edges: readonly TopologyEdge[],
): HopNeighborhood {
  const adjacency = new Map<string, Set<string>>();
  const touch = (id: string): Set<string> => {
    let set = adjacency.get(id);
    if (!set) {
      set = new Set<string>();
      adjacency.set(id, set);
    }
    return set;
  };

  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    touch(edge.source).add(edge.target);
    touch(edge.target).add(edge.source);
  }
  if (!adjacency.has(centerId)) return { hop1: [], hop2: [], edges: [] };

  const distance = new Map<string, number>([[centerId, 0]]);
  const queue = [centerId];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const next = distance.get(current)! + 1;
    if (next > 2) continue;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (distance.has(neighbor)) continue;
      distance.set(neighbor, next);
      queue.push(neighbor);
    }
  }

  const hop1 = [...distance.entries()].filter(([, d]) => d === 1).map(([id]) => id).sort();
  const hop2 = [...distance.entries()].filter(([, d]) => d === 2).map(([id]) => id).sort();
  const hop1Set = new Set(hop1);
  const hop2Set = new Set(hop2);

  const hopEdges: HopEdge[] = [];
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    const a = distance.get(edge.source);
    const b = distance.get(edge.target);
    if (a === undefined || b === undefined) continue;
    const insideHop1 = hop1Set.has(edge.source) && hop1Set.has(edge.target);
    const touchesCenter = a === 0 || b === 0;
    const crosses = (hop1Set.has(edge.source) && hop2Set.has(edge.target)) || (hop1Set.has(edge.target) && hop2Set.has(edge.source));
    if (touchesCenter || insideHop1) {
      hopEdges.push({ source: edge.source, target: edge.target, hop: 1 });
    } else if (crosses) {
      hopEdges.push({ source: edge.source, target: edge.target, hop: 2 });
    }
  }

  return { hop1, hop2, edges: hopEdges };
}

/**
 * Brandes 介数中心度（无向无权），返回无序点对的原始计数。
 * 2k 节点规模为 O(nm)，构建期执行一次即可。
 */
export function computeBetweenness(
  nodeIds: readonly string[],
  edges: readonly TopologyEdge[],
): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const centrality = new Map<string, number>(nodeIds.map((id) => [id, 0]));

  for (const source of nodeIds) {
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
    const sigma = new Map<string, number>(nodeIds.map((id) => [id, 0]));
    const distance = new Map<string, number>(nodeIds.map((id) => [id, -1]));
    sigma.set(source, 1);
    distance.set(source, 0);

    const queue: string[] = [source];
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head];
      stack.push(v);
      const dv = distance.get(v)!;
      for (const w of adjacency.get(v) ?? []) {
        if (distance.get(w)! < 0) {
          distance.set(w, dv + 1);
          queue.push(w);
        }
        if (distance.get(w) === dv + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          predecessors.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>(nodeIds.map((id) => [id, 0]));
    while (stack.length > 0) {
      const w = stack.pop()!;
      const coefficient = (1 + delta.get(w)!) / sigma.get(w)!;
      for (const v of predecessors.get(w) ?? []) {
        delta.set(v, delta.get(v)! + sigma.get(v)! * coefficient);
      }
      if (w !== source) centrality.set(w, centrality.get(w)! + delta.get(w)!);
    }
  }

  // 无向图每对节点被两个源点各统计一次
  for (const [id, value] of centrality) centrality.set(id, value / 2);
  return centrality;
}
