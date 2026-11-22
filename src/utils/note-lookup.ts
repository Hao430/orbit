import type { CelestialNode } from '@/types/celestial';

export function normalizeNoteKey(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.md$/i, '')
    .toLowerCase();
}

/**
 * 抽屉里的双链只写了标题或别名，需要映射回节点。
 * 解析顺序：完整路径 / 标题 / 别名 / 文件名。重名时先注册者优先。
 */
export function createNoteLookup(
  nodes: readonly CelestialNode[],
): (raw: string) => CelestialNode | undefined {
  const byKey = new Map<string, CelestialNode>();

  const add = (key: string, node: CelestialNode): void => {
    const normalized = normalizeNoteKey(key);
    if (!normalized || byKey.has(normalized)) return;
    byKey.set(normalized, node);
  };

  for (const node of nodes) {
    add(node.id, node);
    add(node.title, node);
    add(node.id.split('/').pop() ?? node.id, node);
    for (const alias of node.aliases) add(alias, node);
  }

  return (raw: string): CelestialNode | undefined => {
    const direct = byKey.get(normalizeNoteKey(raw));
    if (direct) return direct;
    const base = raw.split('/').pop() ?? raw;
    return byKey.get(normalizeNoteKey(base));
  };
}
