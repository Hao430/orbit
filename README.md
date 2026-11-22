# Orbit · 知识引力图谱

<p align="center">
  <img src="src/assets/brand/logo.webp" width="120" alt="Orbit logo" />
</p>

把双链笔记渲染成一片可以探索的星系：节点质量由引用度数涌现，星团由社区发现算法自然聚集，冷启动只显示骨干航道，点击星体再逐级点亮卫星。

基于 **Vue 3** + **AntV G6 5.x** 构建，纯前端、可静态托管（GitHub Pages）。

## 核心特性

- **构建期预计算**：度数、介数中心度、Louvain 社区、星体角色、2D 力导向坐标全部在本地/CI 构建时算好，浏览器首帧直接绘制。
- **视界探索**：冷启动显示骨干星（degree ≥ 3、前 12%、上限 260），单击星体展开 1–2 阶邻域，累积式点亮，再次点击收拢；HUD 可一键重置。
- **悬浮与抽屉**：悬停 280ms 显示摘要，单击同时打开右侧笔记抽屉；抽屉内的 `[[双链]]` 可点击跳转并点亮对应星体。
- **深空视觉**：恒星谱系配色 + G6 原生 halo 光晕 + 星团 hull 轮廓 + 航天毛玻璃 HUD。
- **强类型与测试**：零 `any`，拓扑度量、视界状态机、链接解析等纯函数由 Vitest 覆盖。

## 技术栈

| 分类 | 选型 |
| :--- | :--- |
| 框架 | Vue 3.5（`<script setup>`） |
| 图引擎 | AntV G6 5.1 |
| 构建 | Vite 8 + TypeScript 6 |
| 测试 | Vitest |
| Markdown | markdown-it + DOMPurify |

## 快速开始

```bash
pnpm install
pnpm dev        # predev 自动执行 graph:build
pnpm test       # 纯函数单测
pnpm build      # prebuild 重新生成图谱，再 tsc + vite build
pnpm preview
```

## 测试

```bash
pnpm test            # 115 个用例
pnpm test:coverage   # v8 覆盖率，报告输出到 coverage/
```

覆盖范围：拓扑度量与视界状态机、frontmatter/双链解析、Markdown 消毒、数据加载 composable、HUD/抽屉/悬浮卡组件、G6 图组件交互（mock Graph）、构建管线端到端。覆盖率阈值：语句 90%、分支 80%、函数 90%、行 90%。

## 数据约定

一期从 `docs/wiki/` 读取 Markdown（目录不存在或为空时依次回退 `wiki/`、`scripts/fixtures/wiki`）：

```markdown
---
title: 浏览器渲染管线        # 可选，缺省用文件名
summary: 从解析到上屏……      # 可选，缺省取正文首段
status: active               # active | archived，影响星体角色
tags: [渲染, 性能]           # 用于星团命名
aliases: [渲染管线]          # 双链别名解析
---

正文里可用 [[目标笔记]]、[[目标|别名]]、[[目标#章节]] 或标准 .md 链接。
```

构建产物：

- `public/graph.json`：节点度量、星团、坐标、摘要、正文路径
- `public/wiki/**.md`：去掉 frontmatter 的正文，供抽屉按需 fetch

两者均由 `pnpm graph:build` 生成，并已被 `.gitignore` 忽略。

可选参数：

```bash
node scripts/build-graph.ts --dir docs/wiki --out public/graph.json \
  --backbone-ratio 0.12 --min-degree 3 --max-backbone 260
```

## 目录结构

```text
scripts/
  build-graph.ts          # 解析 wiki、计算拓扑、预布局、写产物
  lib/                    # frontmatter 与双链解析（含单测）
src/
  components/
    graph/                # OrbitGraph（G6）、GalaxyHud、GraphToolbar
    NoteDrawer.vue        # 笔记抽屉（Markdown + 双链跳转）
    HoverSummaryCard.vue  # 悬浮摘要卡
  composables/            # useCelestialGraph / useNoteContent
  types/celestial.ts      # 数据契约
  utils/                  # 度量、拓扑、视界状态机、配色、Markdown
  styles/                 # 设计令牌与 reset
docs/
  dev/                    # 架构与前端工程规范
  wiki/                   # 你的知识库
```

## 交互速查

| 操作 | 行为 |
| :--- | :--- |
| 滚轮 / 拖拽 | 缩放、平移 |
| 悬停 280ms | 摘要卡 |
| 单击星体 | 展开 1–2 阶邻域 + 打开抽屉 |
| 再次单击焦点 | 收拢该焦点的贡献（不影响其他星系） |
| 点击空白 | 关闭抽屉，保留已点亮星系 |
| HUD「重置视界」 | 回到骨干星系 |

## 部署与 CI

首次使用：仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，之后推送到 `main` 即自动发布。

| Workflow | 触发 | 内容 |
| :--- | :--- | :--- |
| `.github/workflows/ci.yml` | Pull Request / 手动 | 覆盖率测试（阈值 90/80/90/90）+ 构建校验，上传 `coverage` artifact |
| `.github/workflows/deploy.yml` | push `main` / 手动 | 测试 → 构建 → 上传 Pages artifact → 部署 |

- Node 24 + pnpm 10，版本由 `package.json` 的 `packageManager` 锁定。
- `base: './'` 让同一份产物同时适用于 `username.github.io` 与 `username.github.io/repo/`，无需按仓库名改配置。
- 构建前自动执行 `graph:build`；`docs/wiki` 为空时使用 `scripts/fixtures/wiki` 的示例数据。
