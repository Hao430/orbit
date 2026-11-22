import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const workDir = mkdtempSync(join(tmpdir(), 'orbit-sync-'));

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

interface FixturePage {
  path: string;
  content: string;
}

function makeWiki(name: string, pages: FixturePage[]): string {
  const root = join(workDir, name, 'llm-wiki');
  for (const page of pages) {
    const full = join(root, page.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, page.content);
  }
  return root;
}

function writeMeta(title: string, summary: string, tags: string[], aliases: string[] = [], status = 'active'): string {
  return [
    '---',
    'title: ' + JSON.stringify(title),
    'summary: ' + JSON.stringify(summary),
    'status: ' + status,
    'tags: [' + tags.map((t) => JSON.stringify(t)).join(', ') + ']',
    'aliases: [' + aliases.map((a) => JSON.stringify(a)).join(', ') + ']',
    '---',
    '',
  ].join('\n');
}

/** 合并 stdout + stderr：报告走 stdout，警告走 stderr */
function sync(sourceRoot: string, destName: string, extraArgs: string[] = []) {
  const dest = join(workDir, destName);
  const result = spawnSync(
    process.execPath,
    ['scripts/sync-llm-wiki.mjs', '--src', sourceRoot, '--dest', dest, ...extraArgs],
    { cwd: resolve(process.cwd()), encoding: 'utf8' },
  );
  return {
    output: (result.stdout ?? '') + (result.stderr ?? ''),
    status: result.status ?? 1,
    dest,
  };
}

function read(dest: string, file: string): string {
  return readFileSync(join(dest, file), 'utf8');
}

const LONG_SUMMARY = '这是一段符合契约长度要求的摘要文字，用来描述这篇笔记解决了什么问题、得出了什么结论，长度控制在四十到八十字之间。';

describe('sync-llm-wiki 目录与过滤', () => {
  const root = makeWiki('basic', [
    { path: 'concepts/standardization.md', content: writeMeta('标准化', LONG_SUMMARY, ['标准化'], ['标准']) + '# 标准化\n\n正文。\n' },
    { path: 'people/malcolm-mclean.md', content: writeMeta('麦克莱恩', LONG_SUMMARY, ['集装箱化'], ['McLean']) + '# 麦克莱恩\n\n见 [[concepts/standardization]]。\n' },
    { path: 'raw/source.md', content: '# raw 不应建图\n' },
    { path: 'raw/x.source.md', content: '# 身份卡也不建图\n' },
  ]);
  const result = sync(root, 'out-basic');

  it('保留子目录结构，跳过 raw 层与 .source.md', () => {
    expect(result.status).toBe(0);
    expect(existsSync(join(result.dest, 'concepts/standardization.md'))).toBe(true);
    expect(existsSync(join(result.dest, 'people/malcolm-mclean.md'))).toBe(true);
    expect(existsSync(join(result.dest, 'source.md'))).toBe(false);
    expect(existsSync(join(result.dest, 'x.source.md'))).toBe(false);
  });

  it('不做链接改写，源即渲染源', () => {
    const page = read(result.dest, 'people/malcolm-mclean.md');
    expect(page).toContain('[[concepts/standardization]]');
  });

  it('frontmatter 字段原样传递', () => {
    const page = read(result.dest, 'people/malcolm-mclean.md');
    expect(page).toContain('title: "麦克莱恩"');
    expect(page).toContain('summary: ' + JSON.stringify(LONG_SUMMARY));
    expect(page).toContain('tags: ["集装箱化"]');
    expect(page).toContain('aliases: ["McLean"]');
    expect(page).toContain('status: active');
  });
});

describe('sync-llm-wiki 契约校验', () => {
  it('缺 frontmatter 时按正文回收摘要，并补 title/tags', () => {
    const root = makeWiki('nofront', [
      {
        path: 'notes/plain.md',
        content: '# 裸页面\n\n这一篇没有任何 frontmatter，但正文第一段足够长，可以被回收成一条符合契约的摘要用于悬浮卡展示。\n\n## 展开\n\n更多内容。\n',
      },
    ]);
    const result = sync(root, 'out-nofront');
    const page = read(result.dest, 'notes/plain.md');
    expect(page).toMatch(/^---\n/);
    expect(page).toContain('title: "plain"');
    expect(page).toMatch(/summary: ".{20,}"/);
    expect(page).toContain('tags: []');
  });

  it('summary 超长时报告，但不擅自改写', () => {
    const tooLong = '过长'.repeat(60);
    const root = makeWiki('toolong', [
      { path: 'a.md', content: writeMeta('甲', tooLong, ['主题']) + '# 甲\n\n正文。\n' },
    ]);
    const result = sync(root, 'out-toolong');
    expect(result.output).toContain('summary 超出');
    expect(read(result.dest, 'a.md')).toContain(tooLong);
  });

  it('悬空链接被报告且只计数', () => {
    const root = makeWiki('broken', [
      { path: 'a.md', content: writeMeta('甲', LONG_SUMMARY, ['主题']) + '# 甲\n\n见 [[ghost-page]] 与 [[b|乙]]。\n' },
      { path: 'b.md', content: writeMeta('乙', LONG_SUMMARY, ['主题']) + '# 乙\n\n回 [[a]]。\n' },
    ]);
    const result = sync(root, 'out-broken');
    expect(result.output).toContain('ghost-page');
    // 悬空链接保留在正文，交给 build-graph 计数
    expect(read(result.dest, 'a.md')).toContain('[[ghost-page]]');
  });

  it('标题、别名、文件名都能被解析为有效目标', () => {
    const root = makeWiki('resolve', [
      { path: 'concepts/containerization.md', content: writeMeta('集装箱化', LONG_SUMMARY, ['集装箱化'], ['集装箱化主题']) + '# 集装箱化\n\n正文。\n' },
      {
        path: 'a.md',
        content: writeMeta('甲', LONG_SUMMARY, ['主题']) + '# 甲\n\n按标题：[[集装箱化]]，按别名：[[集装箱化主题]]，按文件名：[[containerization]]。\n',
      },
    ]);
    const result = sync(root, 'out-resolve');
    expect(result.output).not.toContain('悬空链接');
  });

  it('代码块里的链接不算引用', () => {
    const root = makeWiki('code', [
      {
        path: 'a.md',
        content: writeMeta('甲', LONG_SUMMARY, ['主题']) + '# 甲\n\n```\n[[ghost-in-code]]\n```\n\n正文。\n',
      },
    ]);
    const result = sync(root, 'out-code');
    expect(result.output).not.toContain('ghost-in-code');
  });
});

describe('sync-llm-wiki 增量与校验模式', () => {
  const root = makeWiki('incremental', [
    { path: 'a.md', content: writeMeta('甲', LONG_SUMMARY, ['主题']) + '# 甲\n\n正文。\n' },
    { path: 'b.md', content: writeMeta('乙', LONG_SUMMARY, ['主题']) + '# 乙\n\n正文。\n' },
  ]);

  it('--check 不写盘，漂移时退出码为 2', () => {
    const result = sync(root, 'out-check', ['--check']);
    expect(result.status).toBe(2);
    expect(existsSync(join(result.dest, 'a.md'))).toBe(false);
  });

  it('二次同步无变化', () => {
    sync(root, 'out-incr');
    const again = sync(root, 'out-incr');
    expect(again.output).toContain('更新 0');
  });

  it('清理源里已删除的页面，含子目录', () => {
    const root2 = makeWiki('cleanup', [
      { path: 'a.md', content: writeMeta('甲', LONG_SUMMARY, ['主题']) + '# 甲\n' },
      { path: 'sub/b.md', content: writeMeta('乙', LONG_SUMMARY, ['主题']) + '# 乙\n' },
    ]);
    sync(root2, 'out-cleanup');
    expect(existsSync(join(workDir, 'out-cleanup/sub/b.md'))).toBe(true);
    rmSync(join(workDir, 'cleanup/llm-wiki/sub/b.md'));
    const after = sync(root2, 'out-cleanup');
    expect(after.output).toContain('删除陈旧 1');
    expect(existsSync(join(workDir, 'out-cleanup/sub/b.md'))).toBe(false);
  });

  it('源目录不存在时明确失败', () => {
    const result = sync(join(workDir, 'nope'), 'out-missing');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('找不到 LLM Wiki 源目录');
  });
});
