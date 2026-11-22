/**
 * 极简 frontmatter 解析器（只支持 Orbit wiki 用到的 YAML 子集）：
 * - 标量：title / summary / status
 * - 行内数组：tags: [a, b]
 * - 块数组：
 *     tags:
 *       - a
 *       - b
 * 不引入 gray-matter / js-yaml，避免为一层元数据增加依赖与体积。
 */

export interface FrontmatterData {
  [key: string]: string | string[];
}

export interface ParsedDocument {
  data: FrontmatterData;
  body: string;
}

const DELIMITER = '---';

function parseScalar(value: string): string {
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (quoted && trimmed.length >= 2) return trimmed.slice(1, -1);
  if (trimmed === 'null' || trimmed === '~') return '';
  return trimmed;
}

function parseInlineList(value: string): string[] {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => parseScalar(item))
    .filter((item) => item.length > 0);
}

export function parseFrontmatter(raw: string): ParsedDocument {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.startsWith(DELIMITER + '\n')) return { data: {}, body: text };

  const lines = text.split('\n');
  let closing = -1;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === DELIMITER || line === '...') {
      closing = i;
      break;
    }
  }
  if (closing < 0) return { data: {}, body: text };

  const data: FrontmatterData = {};
  let pendingKey: string | null = null;
  let pendingList: string[] = [];

  const flush = (): void => {
    if (pendingKey) data[pendingKey] = pendingList;
    pendingKey = null;
    pendingList = [];
  };

  for (let i = 1; i < closing; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    if (/^\s+/.test(line) && pendingKey) {
      pendingList.push(parseScalar(line.trim().replace(/^-\s*/, '')));
      continue;
    }

    flush();
    const match = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    const value = match[2].trim();
    if (!value) {
      pendingKey = key;
      pendingList = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = parseInlineList(value);
      continue;
    }
    data[key] = parseScalar(value);
  }
  flush();

  const body = lines.slice(closing + 1).join('\n').replace(/^\n+/, '');
  return { data, body };
}

export function asStringList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 把 Markdown 压成纯文本，用于悬浮摘要与搜索 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => alias || target)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSummary(body: string, maxLength = 140): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => toPlainText(block))
    .filter((text) => text.length > 0);

  const first = paragraphs.find((text) => text.length >= 12) ?? paragraphs[0] ?? '';
  if (first.length <= maxLength) return first;
  return first.slice(0, maxLength).trimEnd() + '…';
}
