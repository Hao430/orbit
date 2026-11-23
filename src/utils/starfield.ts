export interface StarfieldStar {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
  tint: string;
}

const STAR_TINTS = ['#f8fafc', '#cbd5e1', '#bae6fd', '#c7d2fe', '#fde68a'] as const;

/** 确定性伪随机，保证 resize 后星空布局稳定，星点不会乱跳。 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 星点数量随视口面积增长，设上下限防止小屏太稀、大屏掉帧。 */
export function starCount(width: number, height: number): number {
  const area = Math.max(0, width) * Math.max(0, height);
  return Math.max(48, Math.min(180, Math.round(area / 12000)));
}

export function createStars(width: number, height: number, seed = 1): StarfieldStar[] {
  const total = starCount(width, height);
  const random = mulberry32(seed);
  const stars: StarfieldStar[] = [];
  for (let index = 0; index < total; index += 1) {
    const size = random();
    stars.push({
      x: random() * width,
      y: random() * height,
      // 多数是小星点，少量亮星，避免均匀噪声的塑料感
      radius: 0.4 + size * size * 1.5,
      alpha: 0.35 + random() * 0.55,
      phase: random() * Math.PI * 2,
      speed: 0.15 + random() * 0.45,
      tint: STAR_TINTS[Math.floor(random() * STAR_TINTS.length)],
    });
  }
  return stars;
}

/** 呼吸式闪烁：alpha 围绕基础值摆动。 */
export function starAlpha(star: StarfieldStar, elapsedMs: number): number {
  const wave = 0.62 + 0.38 * Math.sin((elapsedMs / 1000) * star.speed + star.phase);
  return Math.min(1, Math.max(0, star.alpha * wave));
}
