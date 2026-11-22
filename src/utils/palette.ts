import type { StarRole } from '@/types/celestial';

export interface RoleTone {
  core: string;
  halo: string;
  label: string;
  description: string;
}

/** 与 styles/tokens.css 中的恒星谱系保持一致；canvas 无法读取 CSS 变量，故在此镜像一份。 */
export const ROLE_TONES: Record<StarRole, RoleTone> = {
  core: { core: '#38bdf8', halo: 'rgba(56, 189, 248, 0.28)', label: '超新星', description: '核心系统 / 高频枢纽' },
  'main-sequence': { core: '#818cf8', halo: 'rgba(129, 140, 248, 0.24)', label: '主序星', description: '标准领域知识' },
  nebula: { core: '#34d399', halo: 'rgba(52, 211, 153, 0.25)', label: '活跃星云', description: '正在迭代的新知识' },
  archive: { core: '#fbbf24', halo: 'rgba(251, 191, 36, 0.22)', label: '归档星', description: '已验证的沉淀' },
  bridge: { core: '#fb7185', halo: 'rgba(251, 113, 133, 0.32)', label: '虫洞枢纽', description: '跨领域桥梁节点' },
  dust: { core: '#cbd5e1', halo: 'rgba(203, 213, 225, 0.12)', label: '星尘', description: '边缘小微笔记' },
};

export const CLUSTER_HUES = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#fb7185', '#cbd5e1'] as const;

export function clusterHue(index: number): string {
  return CLUSTER_HUES[((index % CLUSTER_HUES.length) + CLUSTER_HUES.length) % CLUSTER_HUES.length];
}

export function roleTone(role: StarRole): RoleTone {
  return ROLE_TONES[role];
}

/** 把 #rrggbb 转成带透明度的 rgba，用于星团轮廓与光晕 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
}
