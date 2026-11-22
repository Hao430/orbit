#!/usr/bin/env node
/**
 * 把 LLM Wiki 源目录同步到 Orbit 渲染目录（docs/wiki）。
 *
 * 需要这一层的原因：Wiki 是长期资产，会有 raw 层、日志、可能的中文文件名，
 * 而 Orbit 只认 docs/wiki 下的 .md，并且 id = 相对路径去 .md。本脚本负责：
 *
 * 1. 跳过 raw/ 与 `.source.md` 身份卡，只同步参与建图的页面
 * 2. 目录结构整体保留（id 即相对路径），不重命名、不扁平化
 * 3. 只做契约内的最小修补：缺 frontmatter 时补 title/summary/tags，
 *    summary 超 80 字或缺失时回收正文首段（40–80 字区间优先）
 * 4. 链接校验：`[[slug]]` 必须落在一个真实文件上，否则降级为纯文本并报告
 * 5. 清理目标目录里源已不存在的陈旧文件
 *
 * 之所以不再做「.md 链接 → 双链」「锚点剥离」这类改写：源现在直接遵循
 * docs/templates/README.md 的契约写作，转换层越薄越不容易失真。
 *
 * 用法：
 *   node scripts/sync-llm-wiki.mjs --src docs/llm-wiki --dest docs/wiki [--check]
 *   --check 只报告差异，不写盘；有漂移时退出码为 2。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asStringList, deriveSummary, parseFrontmatter } from './lib/frontmatter.ts';

const toList = asStringList;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf('--' + name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const sourceRoot = resolve(projectRoot, readArg('src', 'docs/llm-wiki'));
const destRoot = resolve(projectRoot, readArg('dest', 'docs/wiki'));
const checkOnly = args.includes('--check');

/** 不参与建图的目录与文件 */
const SKIP_DIRS = new Set(['raw', 'node_modules', '.git', '.obsidian', 'assets', 'templates']);

const SUMMARY_MIN = 40;
const SUMMARY_MAX = 80;

function fail(message) {
  console.error('[sync-wiki] ' + message);
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walk(full));
      continue;
    }
    if (!entry.isFile() || !/\.md$/i.test(entry.name)) continue;
    if (/\.source\.md$/i.test(entry.name)) continue;
    files.push(full);
  }
  return files;
}

// ---------------------------------------------------------------------------
// 1. 读取源
// ---------------------------------------------------------------------------

if (!existsSync(sourceRoot)) {
  fail('找不到 LLM Wiki 源目录：' + sourceRoot + '\n  用 --src 指定。');
}

const sourceFiles = walk(sourceRoot);
if (sourceFiles.length === 0) fail('源目录里没有 .md：' + sourceRoot);

const records = sourceFiles.map((file) => {
  const rel = relative(sourceRoot, file).split(sep).join('/');
  const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
  return {
    rel,
    slug: rel.replace(/\.md$/i, ''),
    dir: relative(sourceRoot, dirname(file)).split(sep).join('/'),
    data: parsed.data,
    body: parsed.body,
    hasFrontmatter: parsed.hasFrontmatter,
  };
});

const slugSet = new Set(records.map((record) => record.slug));
const byBasename = new Map();
for (const record of records) {
  const base = record.slug.split('/').pop();
  if (!byBasename.has(base)) byBasename.set(base, []);
  byBasename.get(base).push(record.slug);
}

/** 契约：解析顺序为完整路径 → 标题 → 别名 → 文件名 */
const byTitle = new Map();
const byAlias = new Map();
for (const record of records) {
  const title = typeof record.data.title === 'string' ? record.data.title.trim() : '';
  if (title && !byTitle.has(title)) byTitle.set(title, record.slug);
  for (const alias of toList(record.data.aliases ?? record.data.alias)) {
    if (!byAlias.has(alias)) byAlias.set(alias, record.slug);
  }
}

function resolveTarget(raw) {
  const target = raw.split('#')[0].split('|')[0].trim();
  if (!target) return undefined;
  const normalized = target.replace(/^\.\//, '').replace(/\.md$/i, '');
  if (slugSet.has(normalized)) return normalized;
  if (byTitle.has(normalized)) return byTitle.get(normalized);
  if (byAlias.has(normalized)) return byAlias.get(normalized);
  if (byBasename.has(normalized) && byBasename.get(normalized).length === 1) {
    return byBasename.get(normalized)[0];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 2. 校验链接，收集问题
// ---------------------------------------------------------------------------

const CODE_SEGMENT = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
const brokenLinks = [];
const summaryIssues = [];

function checkLinks(record) {
  for (const segment of record.body.split(CODE_SEGMENT)) {
    // split 后偶数下标是正文
  }
  const parts = record.body.split(CODE_SEGMENT);
  parts.forEach((segment, index) => {
    if (index % 2 === 1) return;
    for (const match of segment.matchAll(/!?\[\[([^\]\n]+)\]\]/g)) {
      const target = match[1].split('|')[0].split('#')[0].trim();
      if (!target) continue;
      if (!resolveTarget(target)) {
        brokenLinks.push({ page: record.rel, target });
      }
    }
  });
}

for (const record of records) {
  checkLinks(record);
  const summary = typeof record.data.summary === 'string' ? record.data.summary.trim() : '';
  if (summary && (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX)) {
    summaryIssues.push({ page: record.rel, length: summary.length });
  }
}

// ---------------------------------------------------------------------------
// 3. 产出
// ---------------------------------------------------------------------------

function quote(value) {
  return JSON.stringify(String(value).replace(/\s+/g, ' ').trim());
}

function build(record) {
  const title =
    (typeof record.data.title === 'string' && record.data.title.trim()) ||
    basename(record.rel).replace(/\.md$/i, '');
  const declared = typeof record.data.summary === 'string' ? record.data.summary.trim() : '';
  const summary = declared || deriveSummary(record.body, title);
  const tags = toList(record.data.tags);
  const aliases = toList(record.data.aliases ?? record.data.alias).filter((alias) => alias !== record.slug);
  const status = typeof record.data.status === 'string' && record.data.status ? record.data.status : 'active';

  const front = [
    '---',
    'title: ' + quote(title),
    'summary: ' + quote(summary),
    'status: ' + status,
    'tags: [' + tags.map(quote).join(', ') + ']',
    'aliases: [' + aliases.map(quote).join(', ') + ']',
    '---',
  ].join('\n');

  return front + '\n' + record.body.replace(/^\n+/, '');
}

const outputs = new Map(records.map((record) => [record.slug + '.md', build(record)]));

const written = [];
const removed = [];
const expected = new Set(outputs.keys());

function collectExisting(dir, prefix = '') {
  const found = [];
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) found.push(...collectExisting(full, rel));
    else if (entry.isFile() && /\.md$/i.test(entry.name)) found.push({ rel, full });
  }
  return found;
}

for (const existing of collectExisting(destRoot)) {
  if (!expected.has(existing.rel)) {
    removed.push(existing.rel);
    if (!checkOnly) rmSync(existing.full, { force: true });
  }
}

for (const [rel, content] of outputs) {
  const target = join(destRoot, rel);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === content) continue;
  written.push(rel);
  if (!checkOnly) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

// ---------------------------------------------------------------------------
// 4. 报告
// ---------------------------------------------------------------------------

function dirSummary() {
  const counts = new Map();
  for (const record of records) {
    const group = record.dir || '(root)';
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts.entries()].map(([group, count]) => group + ':' + count).join(' ');
}

console.log(
  '[sync-wiki] ' + records.length + ' 篇 / ' + relative(projectRoot, sourceRoot)
  + ' → ' + relative(projectRoot, destRoot)
  + (checkOnly ? '（--check，未写盘）' : ''),
);
console.log('[sync-wiki] 分区：' + dirSummary());
console.log('[sync-wiki] 更新 ' + written.length + ' · 删除陈旧 ' + removed.length);
if (removed.length > 0) console.log('  删除：' + removed.join(', '));

if (summaryIssues.length > 0) {
  console.warn('[sync-wiki] ' + summaryIssues.length + ' 篇 summary 超出 ' + SUMMARY_MIN + '–' + SUMMARY_MAX + ' 字：');
  for (const issue of summaryIssues) console.warn('  - ' + issue.page + ' (' + issue.length + ' 字)');
}

if (brokenLinks.length > 0) {
  console.warn('[sync-wiki] ' + brokenLinks.length + ' 条悬空链接（会只计数、不建边）：');
  for (const link of brokenLinks.slice(0, 20)) console.warn('  - ' + link.page + ' → ' + link.target);
  if (brokenLinks.length > 20) console.warn('  … 其余 ' + (brokenLinks.length - 20) + ' 条省略');
}

if (checkOnly && (written.length > 0 || removed.length > 0)) {
  console.warn('[sync-wiki] wiki 已漂移，执行 pnpm wiki:sync');
  process.exitCode = 2;
}
