import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { replaceWikiLinks } from './wikilink-markdown';

const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
});

/** wiki 正文渲染：双链转内部锚点，其余交给 markdown-it，最后统一消毒 */
export function renderMarkdown(source: string, titleResolver?: (target: string) => string | undefined): string {
  const html = renderer.render(replaceWikiLinks(source, titleResolver));
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}
