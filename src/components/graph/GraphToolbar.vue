<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'fit'): void;
  (e: 'reset'): void;
}>();

const helpOpen = ref(false);
</script>

<template>
  <div class="toolbar-anchor">
    <div v-if="helpOpen" class="help-popover" role="tooltip">
      <div class="help-head">
        <span class="help-title">深空观测指南</span>
        <button class="help-close" type="button" aria-label="关闭指南" @click="helpOpen = false">×</button>
      </div>
      <ul class="help-list">
        <li><span class="key">滚轮</span> 缩放引力视界</li>
        <li><span class="key">画布拖拽</span> 平移深空观测站</li>
        <li><span class="key">节点拖拽</span> 微调天体引力拓扑</li>
        <li><span class="key">单击星体</span> 展开 1-2 阶引力轨道</li>
        <li><span class="key">悬停星体</span> 预览天体档案摘要</li>
        <li><span class="key">⌘K / Ctrl+K</span> 全局搜索快速跃迁</li>
      </ul>
    </div>

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
      <span class="toolbar-divider" />
      <button
        type="button"
        class="help-toggle-btn"
        :class="{ 'is-active': helpOpen }"
        title="操作指南"
        aria-label="操作指南"
        @click="helpOpen = !helpOpen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-anchor {
  position: absolute;
  left: 20px;
  bottom: 20px;
  z-index: var(--z-floating-controls);
}

.help-popover {
  position: absolute;
  left: 0;
  bottom: calc(100% + 12px);
  width: 260px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(13, 16, 26, 0.88);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 40px -12px rgba(0, 0, 0, 0.8);
  animation: popover-in 240ms var(--ease-gravity);
}

@keyframes popover-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.help-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-primary);
}

.help-close {
  width: 20px;
  height: 20px;
  font-size: 16px;
  line-height: 1;
  color: var(--text-muted);
  border-radius: 4px;
}

.help-close:hover {
  color: var(--text-primary);
}

.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.help-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #67e8f9;
  min-width: 52px;
  text-align: center;
}

.graph-toolbar {
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
  animation: toolbar-in 360ms var(--ease-gravity);
}

@keyframes toolbar-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 200ms var(--ease-gravity);
}

button:hover {
  color: #67e8f9;
  background: rgba(255, 255, 255, 0.09);
  transform: translateY(-2px) scale(1.08);
  box-shadow: 0 0 12px rgba(103, 232, 249, 0.28);
}

button.is-active {
  color: #67e8f9;
  background: rgba(103, 232, 249, 0.12);
  border: 1px solid rgba(103, 232, 249, 0.3);
}

button:active {
  transform: translateY(0) scale(0.92);
}

button svg {
  width: 16px;
  height: 16px;
  transition: transform 200ms var(--ease-gravity);
}

button:hover svg {
  transform: scale(1.08);
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: rgba(255, 255, 255, 0.08);
}
</style>
