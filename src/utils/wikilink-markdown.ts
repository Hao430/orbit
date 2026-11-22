/**
 * 把 wiki 双链预处理成标准 Markdown 链接，交给 markdown-it 渲染。
 * 代码块 / 行内代码里的内容保持原样。
 */

export const CODE_SEGMENT = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
export const WIKILINK = /!?\[\[([^\]\n]+)\]\]/g;

export function isExternal(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');
}

function replaceInProse(text: string): string {
  return text.replace(WIKILINK, (match, inner: string) => {
    const [targetPart, aliasPart] = inner.split('|');
    const target = targetPart.split('#')[0].trim();
    if (!target || isExternal(target)) return match;
    const label = (aliasPart ?? targetPart).trim() || target;
    const href = '#orbit=' + encodeURIComponent(target);
    return '[' + label + '](' + href + ')';
  });
}

export function replaceWikiLinks(source: string): string {
  return source
    .split(CODE_SEGMENT)
    .map((segment, index) => (index % 2 === 1 ? segment : replaceInProse(segment)))
    .join('');
}

export const ORBIT_LINK_PREFIX = '#orbit=';

export function parseOrbitHref(href: string): string | null {
  if (!href.startsWith(ORBIT_LINK_PREFIX)) return null;
  try {
    return decodeURIComponent(href.slice(ORBIT_LINK_PREFIX.length));
  } catch {
    return null;
  }
}
