import type { CelestialNode } from '@/types/celestial';
import { HOP_SIZE_SCALE } from './celestial-math';
import { roleTone } from './palette';

/** 0 = 骨干 / 焦点星，1 = 一阶卫星，2 = 二阶微尘 */
export type Hop = 0 | 1 | 2;

const MIN_RENDER_SIZE = 7;

export function nodeSize(node: CelestialNode, hop: Hop): number {
  if (hop === 0) return node.metrics.size;
  return Math.max(MIN_RENDER_SIZE, node.metrics.size * HOP_SIZE_SCALE[hop]);
}

export function nodeStyle(node: CelestialNode, hop: Hop): Record<string, unknown> {
  const tone = roleTone(node.role);
  const size = nodeSize(node, hop);
  return {
    x: node.x,
    y: node.y,
    size,
    fill: tone.core,
    stroke: hop === 0 ? 'rgba(248, 250, 252, 0.35)' : 'rgba(226, 232, 240, 0.18)',
    lineWidth: hop === 0 ? 1.2 : 1,
    halo: true,
    haloStroke: tone.core,
    haloLineWidth: Math.max(6, size * 0.6),
    haloOpacity: Math.min(0.8, node.metrics.haloAlpha * (hop === 2 ? 0.55 : 1)),
    label: hop !== 2,
    labelText: node.title,
    labelFill: hop === 0 ? 'rgba(226, 232, 240, 0.92)' : 'rgba(148, 163, 184, 0.8)',
    labelFontSize: hop === 0 ? 11 : 10,
    labelFontWeight: hop === 0 ? 500 : 400,
    labelPlacement: 'bottom',
    labelOffsetY: 7,
    labelMaxWidth: 150,
    opacity: 1,
    cursor: 'pointer',
  };
}

export function edgeStyle(hop: Hop): Record<string, unknown> {
  if (hop === 0) {
    return {
      stroke: 'rgba(129, 140, 248, 0.38)',
      lineWidth: 1.4,
      strokeOpacity: 1,
      opacity: 1,
      endArrow: false,
      lineAppendWidth: 4,
    };
  }
  return {
    stroke: hop === 1 ? 'rgba(148, 163, 184, 0.26)' : 'rgba(148, 163, 184, 0.11)',
    lineWidth: hop === 1 ? 1 : 0.8,
    strokeOpacity: 1,
    opacity: 1,
    endArrow: false,
    lineAppendWidth: 4,
  };
}
