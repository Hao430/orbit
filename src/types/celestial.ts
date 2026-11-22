/**
 * 天体知识网络核心数据契约。
 *
 * 这些类型同时被构建期预计算脚本（scripts/build-graph.ts）与前端消费，
 * 任何字段变更都会影响 public/graph.json 的结构，修改前请同步脚本。
 */

/** 星体角色，由拓扑与笔记状态涌现，不人工指定。 */
export type StarRole =
  | 'core' // 超新星：高频高质核心
  | 'main-sequence' // 主序星：标准领域知识
  | 'nebula' // 活跃星云：正在迭代的新知识
  | 'archive' // 黄矮星：已归档沉淀
  | 'bridge' // 虫洞枢纽：跨星系介数中心度极高
  | 'dust'; // 微星星尘：边缘低度笔记

export interface CelestialMetrics {
  degree: number;
  size: number;
  haloAlpha: number;
  mass: number;
  isBridge: boolean;
}

export interface CelestialNode {
  id: string;
  title: string;
  /** 悬浮卡片展示的摘要，来自 frontmatter.summary 或正文首段 */
  summary: string;
  clusterId: string;
  /** frontmatter 里声明的别名，用于抽屉内的双链跳转解析 */
  aliases: string[];
  role: StarRole;
  degree: number;
  betweenness: number;
  /** 是否属于冷启动骨干星系 */
  backbone: boolean;
  /** 抽屉正文相对 public/ 的路径，例如 wiki/渲染/WebGL.md */
  notePath: string;
  x: number;
  y: number;
  metrics: CelestialMetrics;
}

export interface CelestialEdge {
  id: string;
  source: string;
  target: string;
  /** 两篇笔记之间的引用次数，驱动弹簧刚度 */
  weight: number;
  kind: 'orbital' | 'interstellar';
}

export interface CelestialCluster {
  id: string;
  label: string;
  nodeCount: number;
}

export interface CelestialGraphMeta {
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  backboneCount: number;
  /** 指向不存在笔记的链接数量，一期只统计不建节点 */
  unresolvedLinks: number;
  /** 度数为 0 的孤立笔记数量，二期再处理 */
  orphanCount: number;
}

export interface CelestialGraph {
  meta: CelestialGraphMeta;
  clusters: CelestialCluster[];
  nodes: CelestialNode[];
  edges: CelestialEdge[];
}
