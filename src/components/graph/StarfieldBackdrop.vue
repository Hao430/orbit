<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createStars, starAlpha, type StarfieldStar } from '@/utils/starfield';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const FRAME_MS = 1000 / 30;
const MAX_DPR = 2;
const SEED = 20240501;

let ctx: CanvasRenderingContext2D | null = null;
let stars: StarfieldStar[] = [];
let frameId = 0;
let lastDraw = 0;
let width = 0;
let height = 0;

function draw(elapsedMs: number): void {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    const alpha = starAlpha(star, elapsedMs);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.tint;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    if (star.radius > 1.5) {
      ctx.globalAlpha = alpha * 0.14;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function resize(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  width = canvas.clientWidth || window.innerWidth;
  height = canvas.clientHeight || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx = canvas.getContext('2d');
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = createStars(width, height, SEED);
  draw(lastDraw);
}

function frame(now: number): void {
  frameId = requestAnimationFrame(frame);
  // 30fps 上限：星空是背景层，60fps 只是白烧 GPU
  if (now - lastDraw < FRAME_MS) return;
  lastDraw = now;
  draw(now);
}

onMounted(() => {
  resize();
  window.addEventListener('resize', resize);
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) frameId = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', resize);
});
</script>

<template>
  <canvas ref="canvasRef" class="starfield-backdrop" aria-hidden="true" />
</template>

<style scoped>
.starfield-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  contain: strict;
}
</style>
