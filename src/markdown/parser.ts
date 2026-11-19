import type { Content, Heading, Image, InlineCode, Link, Code, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { createSlugger } from './slugify.js';

export interface MarkdownLinkRef {
  kind: 'link' | 'image';
  url: string;
  line: number;
  column: number;
}

export interface MarkdownCodeRef {
  kind: 'inline' | 'block';
  value: string;
  lang: string | null;
  line: number;
  column: number;
}

export interface MarkdownHeadingRef {
  text: string;
  slug: string;
  line: number;
}

export interface ParsedMarkdown {
  file: string;
  links: MarkdownLinkRef[];
  headings: MarkdownHeadingRef[];
  headingSlugs: Set<string>;
  codeSnippets: MarkdownCodeRef[];
}

const processor = unified().use(remarkParse);

/** Extrait le texte brut d'un nœud mdast (utile pour les titres contenant du code ou du gras) */
function extractPlainText(node: Content | Root): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => extractPlainText(child)).join('');
  }
  return '';
}

/** Parcourt récursivement un arbre mdast */
function walkNode(
  node: Content | Root,
  visitor: {
    onHeading: (n: Heading) => void;
    onLink: (n: Link) => void;
    onImage: (n: Image) => void;
    onInlineCode: (n: InlineCode) => void;
    onCode: (n: Code) => void;
  },
): void {
  switch (node.type) {
    case 'heading':
      visitor.onHeading(node);
      break;
    case 'link':
      visitor.onLink(node);
      break;
    case 'image':
      visitor.onImage(node);
      break;
    case 'inlineCode':
      visitor.onInlineCode(node);
      break;
    case 'code':
      visitor.onCode(node);
      break;
    default:
      break;
  }

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      walkNode(child, visitor);
    }
  }
}

/** Parse un fichier Markdown et extrait titres, liens, images et blocs de code avec positions */
export function parseMarkdown(file: string, content: string): ParsedMarkdown {
  const tree = processor.parse(content);
  const slugger = createSlugger();

  const links: MarkdownLinkRef[] = [];
  const headings: MarkdownHeadingRef[] = [];
  const headingSlugs = new Set<string>();
  const codeSnippets: MarkdownCodeRef[] = [];

  walkNode(tree, {
    onHeading(node) {
      const text = extractPlainText(node);
      const slug = slugger(text);
      headings.push({
        text,
        slug,
        line: node.position?.start.line ?? 1,
      });
      headingSlugs.add(slug);
    },
    onLink(node) {
      links.push({
        kind: 'link',
        url: node.url,
        line: node.position?.start.line ?? 1,
        column: node.position?.start.column ?? 1,
      });
    },
    onImage(node) {
      links.push({
        kind: 'image',
        url: node.url,
        line: node.position?.start.line ?? 1,
        column: node.position?.start.column ?? 1,
      });
    },
    onInlineCode(node) {
      codeSnippets.push({
        kind: 'inline',
        value: node.value,
        lang: null,
        line: node.position?.start.line ?? 1,
        column: node.position?.start.column ?? 1,
      });
    },
    onCode(node) {
      codeSnippets.push({
        kind: 'block',
        value: node.value,
        lang: node.lang ?? null,
        line: node.position?.start.line ?? 1,
        column: node.position?.start.column ?? 1,
      });
    },
  });

  return { file, links, headings, headingSlugs, codeSnippets };
}
