/**
 * BlockSuite PageEditor 的 React 挂载封装。
 *
 * 职责:
 *  - 把 note.content(Markdown)加载进 BlockSuite 文档;
 *  - 订阅文档变更,把内容以 Markdown 回传给上层(用于保存到后端)。
 *
 * Blocksuite 是 web components 方案,不依赖 AFFiNE。关键坑见 docs/blocksuite-spike.md。
 */

import { useEffect, useRef } from 'react';
import { DocCollection, Schema, type Doc } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { createDefaultDoc } from '@blocksuite/blocks';
import { PageEditor } from '@blocksuite/presets';
import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import { docToMarkdown, loadMarkdownToDoc } from '@/lib/blocksuite-markdown';

// 注册自定义元素(幂等,避免 StrictMode 二次挂载重复 define)
if (typeof customElements !== 'undefined' && !customElements.get('page-editor')) {
  blocksEffects();
  presetsEffects();
}

// 模块级单例:一个 DocCollection 承载多篇文档(以 note id 为文档 id)
let _collection: DocCollection | null = null;

function getCollection(): DocCollection {
  if (!_collection) {
    const schema = new Schema();
    schema.register(AffineSchemas);
    _collection = new DocCollection({ schema });
    // 关键:不 initialize 时 createDoc/getDoc 会返回 null
    _collection.meta.initialize();
  }
  return _collection;
}

function ensureDoc(docId: string, title: string | undefined, markdown: string | undefined): Doc {
  const collection = getCollection();
  const existing = collection.getDoc(docId);
  if (existing) return existing;

  const doc = createDefaultDoc(collection, { id: docId, title });
  // 仅在有内容时清空默认段落并加载 Markdown;空笔记保留默认空段落便于直接输入
  if (markdown) {
    const note = doc.getBlocks().find((b) => b.flavour === 'affine:note');
    if (note) {
      for (const child of [...note.children]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc.deleteBlock(child as any, { deleteChildren: true });
      }
      loadMarkdownToDoc(doc, markdown, note.id);
      doc.resetHistory();
    }
  }
  return doc;
}

export interface BlockSuiteEditorProps {
  /** 文档 id(与后端 note id 对齐) */
  docId: string;
  /** 初始 Markdown 内容(仅在文档首次创建时加载) */
  initialContent?: string;
  /** 初始标题 */
  initialTitle?: string;
  /** 内容变化回调(Markdown),防抖约 400ms */
  onChange?: (markdown: string) => void;
  className?: string;
}

export default function BlockSuiteEditor({
  docId,
  initialContent,
  initialTitle,
  onChange,
  className,
}: BlockSuiteEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const doc = ensureDoc(docId, initialTitle, initialContent);
    const editor = new PageEditor();
    editor.doc = doc;
    editor.hasViewport = false;
    host.appendChild(editor);

    let timer: ReturnType<typeof setTimeout> | undefined;
    // 装载后短暂延迟再武装监听,避免初次挂载的块事件触发无谓保存
    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 500);

    const disposable = doc.slots.blockUpdated.on(() => {
      if (!armed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onChangeRef.current?.(docToMarkdown(doc));
      }, 400);
    });

    return () => {
      clearTimeout(armTimer);
      disposable.dispose();
      if (timer) clearTimeout(timer);
      editor.remove();
    };
  }, [docId]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ height: '100%', overflow: 'auto' }}
    />
  );
}
