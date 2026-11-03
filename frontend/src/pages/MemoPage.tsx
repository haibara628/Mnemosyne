import { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import BlockSuiteEditor from '../components/editor/BlockSuiteEditor';
import { useNoteList, useNote, useUpdateNote } from '../hooks/useNotes';
import { Button } from '@/components/ui/button';

const MEMO_TITLE = '待办备忘录';

export default function MemoPage() {
  const listQuery = useNoteList({ page_size: 100 });
  const memoId = listQuery.data?.items.find((n) => n.title === MEMO_TITLE)?.id;
  const { data: note, isLoading: noteLoading } = useNote(memoId);
  const updateNote = useUpdateNote();

  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (note) setContent(note.content);
  }, [note]);

  const save = useCallback(async () => {
    if (!memoId || !note) return;
    setIsSaving(true);
    try {
      await updateNote.mutateAsync({
        id: memoId,
        body: { title: MEMO_TITLE, content },
      });
    } finally {
      setIsSaving(false);
    }
  }, [memoId, note, content, updateNote]);

  // Ctrl+S 手动保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  // 防抖自动保存
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => {
      if (content !== note.content) save();
    }, 3000);
    return () => clearTimeout(timer);
  }, [content]);

  if (listQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (listQuery.error || !memoId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">📝</p>
          <p className="text-muted-foreground">暂无备忘录</p>
        </div>
      </div>
    );
  }

  if (noteLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">📝</p>
          <p className="text-muted-foreground">暂无备忘录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        {/* 标题栏 */}
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="size-5 text-muted-foreground" />
          <h1 className="flex-1 text-xl font-bold text-foreground">{MEMO_TITLE}</h1>
          <span className={`text-xs transition-opacity ${isSaving ? 'opacity-100 text-primary' : 'opacity-0'}`}>
            Saving...
          </span>
          <Button size="sm" onClick={save}>Save</Button>
        </div>

        {/* BlockSuite 编辑器(内容为 Markdown) */}
        <div className="border rounded-lg overflow-hidden bg-background">
          <BlockSuiteEditor
            docId={note.id}
            initialContent={note.content}
            initialTitle={note.title}
            onChange={setContent}
            className="min-h-[60vh]"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          备忘录内容自动保存,或按 Ctrl+S 手动保存。
        </p>
      </div>
    </div>
  );
}
