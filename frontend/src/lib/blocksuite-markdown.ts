/**
 * BlockSuite 文档 <-> Markdown 的轻量转换。
 *
 * 选择 Markdown 作为笔记持久化格式的原因:
 *  - 后端 `content` 是字符串字段,Markdown 与既有 FTS(`strip_markdown`)、
 *    `[[wiki-link]]` 解析完全兼容,不改变 notes/search 的对外行为。
 *  - BlockSuite 原生 JSON snapshot 是 Yjs 块树,直接存 JSON 会破坏全文搜索。
 *
 * 覆盖 P0 常用块:标题 / 段落 / 引用 / 列表(无序·有序·任务) / 代码块 / 分隔线。
 */

import type { Doc } from '@blocksuite/store';

type AnyBlock = {
  id: string;
  flavour: string;
  text?: { toString(): string } | null;
  type?: string;
  language?: string | null;
  checked?: boolean;
  children?: AnyBlock[];
};

/** 把 BlockSuite 文档转成 Markdown 字符串。 */
export function docToMarkdown(doc: Doc): string {
  const root = doc.root as unknown as AnyBlock | null;
  if (!root) return '';

  const lines: string[] = [];

  const walk = (block: AnyBlock, indent: number) => {
    const text = block.text?.toString() ?? '';

    if (block.flavour === 'affine:paragraph') {
      const type = block.type ?? 'text';
      if (/^h[1-6]$/.test(type)) {
        const level = Number(type.slice(1));
        lines.push(`${'#'.repeat(level)} ${text}`);
      } else if (type === 'quote') {
        for (const l of text.split('\n')) lines.push(`> ${l}`);
      } else {
        lines.push(text);
      }
    } else if (block.flavour === 'affine:list') {
      const type = block.type ?? 'bulleted';
      const marker =
        type === 'numbered'
          ? '1. '
          : type === 'todo'
            ? block.checked
              ? '- [x] '
              : '- [ ] '
            : '- ';
      lines.push(`${'  '.repeat(indent)}${marker}${text}`);
    } else if (block.flavour === 'affine:code') {
      lines.push(`\`\`\`${block.language ?? ''}`);
      lines.push(...text.split('\n'));
      lines.push('```');
    } else if (block.flavour === 'affine:divider') {
      lines.push('---');
    } else if (text) {
      // 其他带文本的块,退化为纯文本段落
      lines.push(text);
    }

    const childIndent =
      block.flavour === 'affine:list' ? indent + 1 : indent;
    for (const child of block.children ?? []) {
      walk(child, childIndent);
    }
  };

  walk(root, 0);
  return lines.join('\n');
}

/** 把 Markdown 字符串解析成块,追加到 parentId(通常是 affine:note)下。 */
export function loadMarkdownToDoc(doc: Doc, markdown: string, parentId: string): void {
  if (!markdown) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addBlock = (flavour: string, props: Record<string, unknown>) =>
    (doc.addBlock as any)(flavour, props, parentId);

  const lines = markdown.split('\n');
  const textBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length === 0) return;
    addBlock('affine:paragraph', {
      text: new doc.Text(textBuf.join('\n')),
      type: 'text',
    });
    textBuf.length = 0;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // 代码块
    if (line.startsWith('```')) {
      flushText();
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过收尾 ```
      addBlock('affine:code', {
        text: new doc.Text(codeLines.join('\n')),
        language: lang || null,
      });
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      flushText();
      addBlock('affine:divider', {});
      i += 1;
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushText();
      addBlock('affine:paragraph', {
        text: new doc.Text(heading[2]),
        type: `h${heading[1].length}`,
      });
      i += 1;
      continue;
    }

    // 引用
    if (line.startsWith('> ')) {
      flushText();
      addBlock('affine:paragraph', {
        text: new doc.Text(line.slice(2)),
        type: 'quote',
      });
      i += 1;
      continue;
    }

    // 任务列表
    const todo = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (todo) {
      flushText();
      addBlock('affine:list', {
        text: new doc.Text(todo[2]),
        type: 'todo',
        checked: todo[1].toLowerCase() === 'x',
      });
      i += 1;
      continue;
    }

    // 无序列表
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushText();
      addBlock('affine:list', {
        text: new doc.Text(bullet[1]),
        type: 'bulleted',
      });
      i += 1;
      continue;
    }

    // 有序列表
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushText();
      addBlock('affine:list', {
        text: new doc.Text(ordered[1]),
        type: 'numbered',
      });
      i += 1;
      continue;
    }

    // 空行 → 结束当前段落
    if (line.trim() === '') {
      flushText();
      i += 1;
      continue;
    }

    // 普通段落文本(连续行合并为一个段落)
    textBuf.push(line.trim());
    i += 1;
  }
  flushText();
}
