import { computeTwoHopNeighborhood, type TopologyEdge } from './topology';

/**
 * 视界探索状态机（纯数据，不依赖 Vue / G6）。
 *
 * 一期采用累积式探索：每个被点亮的星体记录“它是被哪些焦点星拉进视界的”，
 * 以及距离该焦点是 1 阶还是 2 阶。只有当所有焦点都撤销后，非骨干节点才会消失。
 */

export interface HorizonState {
  /** 当前已展开的焦点星 */
  centers: ReadonlySet<string>;
  /** nodeId -> (centerId -> hop)，hop 取所有焦点中的最小值 */
  refs: ReadonlyMap<string, ReadonlyMap<string, 1 | 2>>;
  focus: string | null;
}

export interface HorizonSnapshot {
  /** 0 = 骨干 / 焦点星，1 = 一阶卫星，2 = 二阶微尘 */
  nodes: Map<string, 0 | 1 | 2>;
  edges: Map<string, 0 | 1 | 2>;
  focus: string | null;
}

export function edgeKey(edge: TopologyEdge): string {
  return edge.source < edge.target
    ? edge.source + '--' + edge.target
    : edge.target + '--' + edge.source;
}

export function createHorizonState(): HorizonState {
  return { centers: new Set(), refs: new Map(), focus: null };
}

function cloneRefs(
  refs: HorizonState['refs'],
): Map<string, Map<string, 1 | 2>> {
  const next = new Map<string, Map<string, 1 | 2>>();
  for (const [nodeId, byCenter] of refs) next.set(nodeId, new Map(byCenter));
  return next;
}

/**
 * 展开 / 收拢一个焦点星。
 * 展开时把 1 阶邻居记到 1 阶、2 阶邻居记到 2 阶；收拢时只撤销该焦点的贡献。
 */
export function toggleHorizon(
  state: HorizonState,
  centerId: string,
  edges: readonly TopologyEdge[],
  backbone: ReadonlySet<string>,
): HorizonState {
  const centers = new Set(state.centers);
  const refs = cloneRefs(state.refs);

  if (centers.has(centerId)) {
    centers.delete(centerId);
    for (const [nodeId, byCenter] of refs) {
      byCenter.delete(centerId);
      if (byCenter.size === 0) refs.delete(nodeId);
    }
    return { centers, refs, focus: state.focus === centerId ? null : state.focus };
  }

  centers.add(centerId);
  const neighborhood = computeTwoHopNeighborhood(centerId, edges);

  const addRef = (nodeId: string, hop: 1 | 2): void => {
    if (backbone.has(nodeId)) return;
    let byCenter = refs.get(nodeId);
    if (!byCenter) {
      byCenter = new Map<string, 1 | 2>();
      refs.set(nodeId, byCenter);
    }
    const existing = byCenter.get(centerId);
    if (existing === undefined || hop < existing) byCenter.set(centerId, hop);
  };

  for (const nodeId of neighborhood.hop1) addRef(nodeId, 1);
  for (const nodeId of neighborhood.hop2) addRef(nodeId, 2);

  return { centers, refs, focus: centerId };
}

/** 把状态折算成可直接渲染的可见集合与跳数 */
export function snapshotHorizon(
  state: HorizonState,
  edges: readonly TopologyEdge[],
  backbone: ReadonlySet<string>,
): HorizonSnapshot {
  const nodes = new Map<string, 0 | 1 | 2>();
  for (const id of backbone) nodes.set(id, 0);

  for (const [nodeId, byCenter] of state.refs) {
    let hop: 1 | 2 = 2;
    for (const value of byCenter.values()) {
      if (value < hop) hop = value;
    }
    const existing = nodes.get(nodeId);
    if (existing === undefined || hop < existing) nodes.set(nodeId, hop);
  }

  // 焦点星永远以完整尺寸呈现
  for (const center of state.centers) nodes.set(center, 0);

  const visibleEdges = new Map<string, 0 | 1 | 2>();
  for (const edge of edges) {
    const sourceHop = nodes.get(edge.source);
    const targetHop = nodes.get(edge.target);
    if (sourceHop === undefined || targetHop === undefined) continue;
    visibleEdges.set(edgeKey(edge), Math.max(sourceHop, targetHop) as 0 | 1 | 2);
  }

  return { nodes, edges: visibleEdges, focus: state.focus };
}
