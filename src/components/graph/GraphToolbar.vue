<script setup lang="ts">
const emit = defineEmits<{
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'fit'): void;
  (e: 'reset'): void;
}>();
</script>

<template>
  <div class="graph-toolbar">
    <button type="button" title="放大" aria-label="放大" @click="emit('zoom-in')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M11 8.5v5M8.5 11h5M16 16l4 4" stroke-linecap="round" />
      </svg>
    </button>
    <button type="button" title="缩小" aria-label="缩小" @click="emit('zoom-out')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M8.5 11h5M16 16l4 4" stroke-linecap="round" />
      </svg>
    </button>
    <button type="button" title="适应画布" aria-label="适应画布" @click="emit('fit')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" stroke-linecap="round" />
      </svg>
    </button>
    <span class="toolbar-divider" />
    <button type="button" title="重置视界" aria-label="重置视界" @click="emit('reset')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <circle cx="12" cy="12" r="3" />
        <ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(-28 12 12)" />
        <ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(28 12 12)" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.graph-toolbar {
  position: absolute;
  left: 20px;
  bottom: 20px;
  z-index: var(--z-floating-controls);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(13, 16, 26, 0.7);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 14px 30px -12px rgba(0, 0, 0, 0.7);
}

button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 180ms var(--ease-gravity);
}

button:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.07);
}

button svg {
  width: 16px;
  height: 16px;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: rgba(255, 255, 255, 0.08);
}
</style>
