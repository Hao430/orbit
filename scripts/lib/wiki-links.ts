/**
 * 从 Markdown 中抽取知识链接。
 * 一期支持 Obsidian 风格 [[note]] / [[note|alias]] / [[note#heading]]
 * 以及指向本地 .md 的标准 Markdown 链接。
 */

export interface WikiLink {
  target: string;
  alias?: string;
}

/** 去掉代码块与行内代码，避免把示例里的链接当成真实引用 */
export function stripCode(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
}

function isExternal(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');
}

export function extractWikiLinks(markdown: string): WikiLink[] {
  const text = stripCode(markdown);
  const pattern = /!?\[\[([^\]\n]+)\]\]/g;
  const links: WikiLink[] = [];

  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const inner = match[1];
    const [targetPart, aliasPart] = inner.split('|');
    const target = targetPart.split('#')[0].trim();
    if (target && !isExternal(target)) {
      links.push({ target, alias: aliasPart ? aliasPart.trim() : undefined });
    }
    match = pattern.exec(text);
  }

  return links;
}

export function extractMarkdownDocLinks(markdown: string): string[] {
  const text = stripCode(markdown);
  const pattern = /\[[^\]\n]*\]\(([^)\s]+)\)/g;
  const targets: string[] = [];

  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const raw = match[1].split('#')[0].split('?')[0];
    if (!isExternal(raw) && /\.md$/i.test(raw)) {
      try {
        targets.push(decodeURIComponent(raw));
      } catch {
        targets.push(raw);
      }
    }
    match = pattern.exec(text);
  }

  return targets;
}
