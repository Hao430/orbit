---
title: "Wiki 操作日志"
summary: "只追加不改写的操作记录，按时间记下每次摄取、重构与迁移做了什么、留下哪些未解决问题，用于回溯知识库的演进。"
status: archived
tags: ["索引"]
aliases: ["操作日志"]
---
# Wiki Operation Log

> 只追加，不改写历史。条目格式：## [YYYY-MM-DD] operation | subject。

## [2026-08-23] initialize | knowledge base

- 创建 raw 来源层、wiki 编译层、完整索引和 MEMORY 热索引。
- 当前尚未设置主题或摄取来源。

## [2026-11-22] ingest | B站《集装箱革命》字幕（BV12iyvz6EVT）

- 来源：https://www.bilibili.com/video/BV12iyvz6EVT/，`ai-zh` 字幕 793 条（00:00:00 → 00:28:06）。
- 经 `bilibili-ai-subtitle` 技能提取 SRT / TXT / JSON，未下载音视频、未使用 ASR。
- 新增 raw：`2026-11-22-bilibili-BV12iyvz6EVT-ai-subtitle.{txt,json}` 与 `.source.md` 来源身份卡。
- 新增 wiki：`source-bilibili-BV12iyvz6EVT.md`、`transcript-containerization-BV12iyvz6EVT.md`、`containerization.md`。
- 清洗约 20 处 AI 错录（同音字、专名、数字），清单记录在逐字稿页末尾。
- 更新：`index.md`、`overview.md`、`MEMORY.md`。
- 未解决：概念页数字均为单一来源的二手转述，尚未核对一手研究。

## [2026-11-22] restructure | 实体-关系-概念三层重构

用户指出原结构抽取粒度过粗（只有 1 个概念大杂烩页 + 1 个逐字稿）。

- 原 `containerization.md` 降级为主题导航入口，其中混杂的机制全部拆出。
- 新建 **person 6 页**：麦克莱恩、坦特林格、布里奇斯、科斯、莱文森、李嘉图。
- 新建 **organization 8 页**：海陆、美森、泛大西洋、麦克莱恩卡车、ISO、ASA、码头工会、航运企业（合并页）。
- 新建 **vessel 2 页**：理想 X 号、长赐号。
- 新建 **artifact 2 页**：角件、标准集装箱。
- 新建 **place 1 索引页 + 1 待办页**：港口与航道合并索引，附拆分判据。
- 新建 **concept 10 页**：交易成本、标准化、规模经济、网络外部性、比较优势、精益生产、零库存、供应链韧性、件杂货运输、门到门运输、集装箱化导航。
- 新建 **relations.md**：显式记录有向关系并标注证据强度（★★★ 明述 / ★★ 隐含 / ★ 补充）。
- 新建 **timeline.md**：10 个事件按时间排序，含三条因果主线与跨事件机制页。
- 新建 **entities.md**：实体台账与 7 项已知缺口。
- 链接校验：39 个页面，0 断链，0 孤儿页（修掉 32 处指向不存在文件的链接、22 处事件/地点链接改为锚点）。
- 同步：`index.md`（按实体类型分区）、`overview.md`、`log.md`。
- 未解决：地点实体仍为合并索引，需更多来源才能拆分；多数数字仍缺一手出处。

## [2026-11-22] relocate | Wiki 根目录迁至 orbit/docs/wiki

用户指定 `/home/user/projects/orbit/docs/wiki` 为唯一全局 Wiki 路径，且该目录被 Orbit 前端读取建图。

- Wiki 页面（39 篇）与 raw 来源层从工作区 `knowledge-base/` 迁移到 `docs/llm-wiki/`（编辑源）与 `docs/raw/`（原始快照）。
- Orbit 渲染目录为 `docs/wiki/`，由 `scripts/sync-llm-wiki.mjs` 从 `docs/llm-wiki/` 生成，不手写。
- `../raw/` 相对引用保持有效：`docs/llm-wiki/*.md` → `docs/raw/*`。
- SKILL.md 已更新：Wiki 根目录改为绝对路径，raw 层同级约定，Orbit frontmatter 契约（title/summary/status/tags/aliases），并标注 workspace 内 `knowledge-base/wiki` 已废弃。

## [2026-11-22] contract | 按 Orbit 数据契约重建目录与元数据

用户提供 docs/templates/ 契约（节点 id=相对路径、summary 40–80 字、tags 决定星团名、每篇 2–5 条出链）。

- 目录重组：扁平 39 篇 → `concepts/`(10) `people/`(6) `orgs/`(8) `artifacts/`(4) `places/`(2) `hub/`(6) `sources/`(2) + `log.md`。
- 文件名全部改为 ASCII slug，title 保留中文；节点 id 随之变成带目录的完整路径。
- 全量重写链接：`[[旧文件名]]` → `[[完整路径 slug]]`。修掉三类悬空：迁移残留的 `[text](old.md)`、带 `#锚点` 的标准链接、表格内 `[[a|b]]` 竖线冲突。
- 39 篇 summary 按 40–80 字重写，说明「解决什么问题、结论是什么」。
- tags 去掉分类词（人物/组织/概念…），只留主题词（标准化/集装箱化/供应链韧性/经济学理论/劳工/规模经济/港口），避免星团名退化为分类标签。
- 结果：39 nodes / 241 edges / 8 backbone / 7 clusters / 0 unresolved / 0 orphan。
- sync 脚本重写为薄同步层：只做 raw 过滤、缺 frontmatter 补全、链接校验、陈旧清理，不再改写链接。
- 新增 12 个 sync 测试；全项目 127 个测试通过。
