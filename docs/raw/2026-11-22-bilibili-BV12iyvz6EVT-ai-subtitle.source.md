# 来源身份 / Source Identity

- **标题**：集装箱革命：如何让世界变小，让全球市场变宽？
- **平台**：哔哩哔哩 bilibili.com
- **BV 号**：BV12iyvz6EVT
- **原始 URL**：https://www.bilibili.com/video/BV12iyvz6EVT/
- **aid / cid**：117655595911246 / 43805639237
- **视频时长**：1692 秒（28:12）
- **发布日期**：未在元数据中留档（ctime 1795282013）
- **摄取日期**：2026-11-22

## 文件构成

| 文件 | 说明 |
|---|---|
| `2026-11-22-bilibili-BV12iyvz6EVT-ai-subtitle.json` | 原始字幕 JSON，793 条，含 `from` / `to` / `content` |
| `2026-11-22-bilibili-BV12iyvz6EVT-ai-subtitle.txt` | 由上述 JSON 逐条拼接的纯文本字幕 |

## 获取方式

通过 `bilibili-ai-subtitle` 技能，使用用户已登录的 `SESSDATA`，调用
`/x/player/wbi/v2` 取得 `ai-zh` 轨道，再从 `aisubtitle.hdslb.com` 下载字幕 JSON。
未下载视频或音频，未使用 ASR。

## 质量声明

这是**B站 AI 自动生成字幕**，不是人工校对逐字稿。已人工发现并修正的错误类型包括：
同音字（如「墓地港」→「休斯顿港」）、专名错录（如「矫健」→「角件」）、
数字与量词误写（如「几10亿」）。人耳可辨但机器误录的段落可能仍有残留。

Wiki 编译层中的逐字稿页基于本文件清洗，清洗只改明显错录，不改原意、不删内容。
