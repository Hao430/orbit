#!/usr/bin/env node
/**
 * 把 LLM Wiki（扁平文件名 + 中文标题链接）迁移到 Orbit 数据契约：
 *
 * - 节点 id = 相对路径去 .md，所以文件放到子目录后，链接必须写成完整 slug
 *   （`[[people/malcolm-mclean|麦克莱恩]]`），否则会悬空
 * - 文件名用 ASCII slug，title 保持中文
 * - summary 重写为 40–80 字，说明「解决什么问题、结论是什么」
 * - tags 收敛到 1–3 个稳定主题词（决定星团名称）
 * - 每篇补足 2–5 条有意义出链
 *
 * 这是一次性迁移脚本。迁移完成后日常写作走 docs/templates/ 模板。
 *
 * 用法：node scripts/migrate-wiki-layout.mjs --src docs/llm-wiki --dest docs/llm-wiki
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const sourceRoot = resolve(readArg('src', 'docs/llm-wiki'));

/** 旧文件名 → 新相对路径（不含 .md），最后一段即 ASCII slug */
const LAYOUT = {
  // 枢纽页
  'containerization': 'hub/containerization',
  'index': 'hub/index',
  'overview': 'hub/overview',
  'entities': 'hub/entities',
  'relations': 'hub/relations',
  'timeline': 'hub/timeline',

  // 人物
  'person-malcolm-mclean': 'people/malcolm-mclean',
  'person-tantlinger': 'people/keith-tantlinger',
  'person-harry-bridges': 'people/harry-bridges',
  'person-ronald-coase': 'people/ronald-coase',
  'person-marc-levinson': 'people/marc-levinson',
  'person-david-ricardo': 'people/david-ricardo',

  // 组织
  'org-sea-land': 'orgs/sea-land',
  'org-matson': 'orgs/matson',
  'org-pan-atlantic': 'orgs/pan-atlantic',
  'org-mclean-trucking': 'orgs/mclean-trucking',
  'org-iso': 'orgs/iso',
  'org-asa': 'orgs/asa',
  'org-dock-unions': 'orgs/dock-unions',
  'org-container-shipping-lines': 'orgs/carriers',

  // 船舶与技术物
  'vessel-ideal-x': 'artifacts/ideal-x',
  'vessel-ever-given': 'artifacts/ever-given',
  'artifact-corner-casting': 'artifacts/corner-casting',
  'artifact-standard-container': 'artifacts/standard-container',

  // 地点
  'place-ports': 'places/ports',
  'place-entity-todo': 'places/split-todo',

  // 概念
  'concept-containerization': 'concepts/containerization',
  'concept-transaction-cost': 'concepts/transaction-cost',
  'concept-standardization': 'concepts/standardization',
  'concept-economies-of-scale': 'concepts/economies-of-scale',
  'concept-network-externality': 'concepts/network-externality',
  'concept-comparative-advantage': 'concepts/comparative-advantage',
  'concept-lean-production': 'concepts/lean-production',
  'concept-zero-inventory': 'concepts/zero-inventory',
  'concept-supply-chain-resilience': 'concepts/supply-chain-resilience',
  'concept-break-bulk-shipping': 'concepts/break-bulk-shipping',
  'concept-door-to-door-transport': 'concepts/door-to-door',

  // 来源与逐字稿
  'source-bilibili-BV12iyvz6EVT': 'sources/bilibili-bv12iyvz6evt',
  'transcript-containerization-BV12iyvz6EVT': 'sources/transcript-bv12iyvz6evt',
};

/** 每个 slug 的主题标签（1–3 个稳定词，决定星团命名） */
const TAGS = {
  'hub/containerization': ['集装箱化'],
  'hub/index': ['索引'],
  'hub/overview': ['索引'],
  'hub/entities': ['索引'],
  'hub/relations': ['索引'],
  'hub/timeline': ['集装箱化'],

  'people/malcolm-mclean': ['人物', '集装箱化'],
  'people/keith-tantlinger': ['人物', '标准化'],
  'people/harry-bridges': ['人物', '劳工'],
  'people/ronald-coase': ['人物', '经济学理论'],
  'people/marc-levinson': ['人物', '经济学理论'],
  'people/david-ricardo': ['人物', '经济学理论'],

  'orgs/sea-land': ['组织', '集装箱化'],
  'orgs/matson': ['组织', '标准化'],
  'orgs/pan-atlantic': ['组织', '集装箱化'],
  'orgs/mclean-trucking': ['组织', '集装箱化'],
  'orgs/iso': ['组织', '标准化'],
  'orgs/asa': ['组织', '标准化'],
  'orgs/dock-unions': ['组织', '劳工'],
  'orgs/carriers': ['组织', '规模经济'],

  'artifacts/ideal-x': ['技术物', '集装箱化'],
  'artifacts/ever-given': ['技术物', '供应链韧性'],
  'artifacts/corner-casting': ['技术物', '标准化'],
  'artifacts/standard-container': ['技术物', '标准化'],

  'places/ports': ['地点', '港口'],
  'places/split-todo': ['索引', '地点'],

  'concepts/containerization': ['概念', '集装箱化'],
  'concepts/transaction-cost': ['概念', '经济学理论'],
  'concepts/standardization': ['概念', '标准化'],
  'concepts/economies-of-scale': ['概念', '规模经济'],
  'concepts/network-externality': ['概念', '规模经济'],
  'concepts/comparative-advantage': ['概念', '经济学理论'],
  'concepts/lean-production': ['概念', '供应链韧性'],
  'concepts/zero-inventory': ['概念', '供应链韧性'],
  'concepts/supply-chain-resilience': ['概念', '供应链韧性'],
  'concepts/break-bulk-shipping': ['概念', '集装箱化'],
  'concepts/door-to-door': ['概念', '标准化'],

  'sources/bilibili-bv12iyvz6evt': ['来源', '集装箱化'],
  'sources/transcript-bv12iyvz6evt': ['来源', '集装箱化'],
};

/** 标题：从旧 frontmatter 或正文一级标题推不出来时兜底 */
const TITLES = {
  'hub/containerization': '集装箱化（主题枢纽）',
  'hub/index': 'Wiki 索引',
  'hub/overview': '知识库总览',
  'hub/entities': '实体台账',
  'hub/relations': '关系图谱',
  'hub/timeline': '事件时间线',
  'people/malcolm-mclean': '马尔科姆·麦克莱恩',
  'people/keith-tantlinger': '基思·坦特林格',
  'people/harry-bridges': '哈里·布里奇斯',
  'people/ronald-coase': '罗纳德·科斯',
  'people/marc-levinson': '马克·莱文森',
  'people/david-ricardo': '大卫·李嘉图',
  'orgs/sea-land': '海陆公司 Sea-Land',
  'orgs/matson': '美森轮船 Matson',
  'orgs/pan-atlantic': '泛大西洋轮船公司',
  'orgs/mclean-trucking': '麦克莱恩卡车运输',
  'orgs/iso': '国际标准化组织 ISO',
  'orgs/asa': '美国标准协会 ASA',
  'orgs/dock-unions': '码头工会 ILWU 与 ILA',
  'orgs/carriers': '集装箱航运三巨头',
  'artifacts/ideal-x': '理想 X 号 Ideal X',
  'artifacts/ever-given': '长赐号 Ever Given',
  'artifacts/corner-casting': '角件 Corner Casting',
  'artifacts/standard-container': '标准集装箱',
  'places/ports': '港口与航道索引',
  'places/split-todo': '地点实体拆分待办',
  'concepts/containerization': '集装箱化',
  'concepts/transaction-cost': '交易成本',
  'concepts/standardization': '标准化与接口转换成本',
  'concepts/economies-of-scale': '规模经济',
  'concepts/network-externality': '网络外部性',
  'concepts/comparative-advantage': '比较优势',
  'concepts/lean-production': '精益生产',
  'concepts/zero-inventory': '零库存',
  'concepts/supply-chain-resilience': '供应链韧性',
  'concepts/break-bulk-shipping': '件杂货运输',
  'concepts/door-to-door': '门到门运输',
  'sources/bilibili-bv12iyvz6evt': '来源：集装箱革命 BV12iyvz6EVT',
  'sources/transcript-bv12iyvz6evt': '逐字稿：集装箱革命',
};

// ---------------------------------------------------------------------------

const DELIMITER = '---';

function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.startsWith(DELIMITER + '\n')) return { data: {}, body: text };
  const lines = text.split('\n');
  let closing = -1;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === DELIMITER || line === '...') { closing = i; break; }
  }
  if (closing < 0) return { data: {}, body: text };

  const data = {};
  let pendingKey = null;
  let pendingList = [];
  const flush = () => { if (pendingKey) data[pendingKey] = pendingList.slice(); pendingKey = null; pendingList = []; };

  for (let i = 1; i < closing; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\s+/.test(line) && pendingKey) {
      pendingList.push(line.trim().replace(/^-\s*/, '').replace(/^["']|["']$/g, ''));
      continue;
    }
    flush();
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim();
    if (!value) { pendingKey = key; pendingList = []; continue; }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  flush();
  const body = lines.slice(closing + 1).join('\n').replace(/^\n+/, '');
  return { data, body };
}

const files = readdirSync(sourceRoot).filter((f) => f.endsWith('.md'));
const entries = [];

for (const file of files) {
  const legacySlug = basename(file, '.md');
  const target = LAYOUT[legacySlug];
  if (!target) {
    console.warn('[migrate] 未映射，跳过：' + file);
    continue;
  }
  const { data, body } = parseFrontmatter(readFileSync(join(sourceRoot, file), 'utf8'));
  entries.push({ legacySlug, target, data, body });
}

const legacyToTarget = new Map(entries.map((e) => [e.legacySlug, e.target]));

// ---------------------------------------------------------------------------
// 链接重写：旧 slug → 新完整路径 slug
// ---------------------------------------------------------------------------

const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;

function rewriteLinks(body) {
  return body
    .split(CODE)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;

      // [[old-slug|label]] 与 [[old-slug]]
      let out = segment.replace(/\[\[([^\]\n|#]+)(?:\|([^\]\n]*))?\]\]/g, (match, target, label) => {
        const key = target.trim();
        const mapped = legacyToTarget.get(key);
        if (!mapped) return match; // 已是新 slug 或外部引用，保持原样
        return '[[' + mapped + (label ? '|' + label : '') + ']]';
      });

      // [text](old-slug.md) 形式
      out = out.replace(/\[([^\]]*)\]\(([^)\s]+)\.md\)/g, (match, text, path) => {
        const key = path.replace(/^\.\//, '');
        const mapped = legacyToTarget.get(key);
        if (!mapped) return match;
        return '[[' + mapped + '|' + text + ']]';
      });

      return out;
    })
    .join('');
}

// ---------------------------------------------------------------------------

const written = [];

for (const entry of entries) {
  const body = rewriteLinks(entry.body);
  const title = TITLES[entry.target] ?? entry.data.title ?? basename(entry.target);
  const tags = TAGS[entry.target] ?? ['未分类'];
  const summary = entry.data.summary && String(entry.data.summary).length >= 40
    ? entry.data.summary
    : null;

  // aliases：保留旧 title / 旧 aliases，去掉与 slug 重复的
  const aliasSet = new Set();
  const rawAliases = entry.data.aliases ?? entry.data.alias ?? [];
  for (const a of Array.isArray(rawAliases) ? rawAliases : [rawAliases]) {
    const v = String(a).trim();
    if (v && v !== title) aliasSet.add(v);
  }
  const legacyTitle = entry.data.title;
  if (legacyTitle && legacyTitle !== title) aliasSet.add(legacyTitle);

  const status = entry.data.status === 'archived' ? 'archived' : 'active';

  const yaml = [
    '---',
    'title: ' + JSON.stringify(title),
    'summary: ' + JSON.stringify(summary ?? ''),
    'status: ' + status,
    'tags: [' + tags.map((t) => JSON.stringify(t)).join(', ') + ']',
    'aliases: [' + [...aliasSet].map((a) => JSON.stringify(a)).join(', ') + ']',
    '---',
    '',
  ].join('\n');

  const outPath = join(sourceRoot, entry.target + '.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, yaml + body.trim() + '\n');
  written.push({ from: entry.legacySlug, to: entry.target, needsSummary: !summary });
}

console.log('[migrate] 迁移 ' + written.length + ' 篇');
const noSummary = written.filter((w) => w.needsSummary);
if (noSummary.length > 0) {
  console.log('[migrate] 需要补 summary（40–80 字）的页面：');
  for (const w of noSummary) console.log('  - ' + w.to);
}

// 删除旧文件（根目录下的扁平文件）
for (const entry of entries) {
  const old = join(sourceRoot, entry.legacySlug + '.md');
  if (existsSync(old) && old !== join(sourceRoot, entry.target + '.md')) {
    const { rmSync } = await import('node:fs');
    rmSync(old, { force: true });
  }
}

console.log('[migrate] 完成。下一步：补齐 summary，然后 pnpm wiki:sync && pnpm graph:build');
