import type { CelestialMetrics } from '@/types/celestial';

/** 与 docs/dev/CELESTIAL_KNOWLEDGE_GRAPH_SPEC.md §2.1 保持一致 */
export const SIZE_MIN = 12;
export const SIZE_MAX = 60;
export const HALO_MIN = 0.15;
export const HALO_MAX = 0.8;

/** 1 阶卫星 / 2 阶微尘相对母星的尺寸比例（COSMIC_DESIGN §5.2） */
export const HOP_SIZE_SCALE = { 1: 0.65, 2: 0.4 } as const;

export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/** R = clamp(12, 60, log2(k + 1) × 16) */
export function computeNodeSize(degree: number): number {
  const k = Math.max(0, degree);
  return clamp(SIZE_MIN, SIZE_MAX, Math.log2(k + 1) * 16);
}

/** α = clamp(0.15, 0.8, 0.15 + k × 0.05) */
export function computeHaloAlpha(degree: number): number {
  const k = Math.max(0, degree);
  // 保留三位小数，避免 0.15 + 3 * 0.05 这类浮点噪声进入序列化产物
  return clamp(HALO_MIN, HALO_MAX, Math.round((HALO_MIN + k * 0.05) * 1000) / 1000);
}

/** 物理质量影响斥力与弹簧衰减 */
export function computeMass(degree: number): number {
  return Math.max(1, Math.sqrt(Math.max(0, degree) + 1) * 2);
}

export function computeCelestialMetrics(degree: number, isBridge = false): CelestialMetrics {
  return {
    degree,
    size: computeNodeSize(degree),
    haloAlpha: computeHaloAlpha(degree),
    mass: computeMass(degree),
    isBridge,
  };
}

/** 视界展开时按跳数衰减尺寸，1 阶 65%，2 阶 40% */
export function scaleSizeByHop(size: number, hop: 1 | 2): number {
  return size * HOP_SIZE_SCALE[hop];
}
