import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // build-graph.ts 以子进程方式端到端执行，v8 无法插桩；其行为由 build-graph.test.ts 断言
      include: ['src/**/*.{ts,vue}', 'scripts/lib/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.test.ts',
        'src/test-utils/**',
        'src/types/**',
        'scripts/**/*.test.ts',
        'scripts/fixtures/**',
      ],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
