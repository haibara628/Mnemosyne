import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlockSuiteEditor from '../components/editor/BlockSuiteEditor';
import BacklinksPanel from '../components/layout/BacklinksPanel';
import { useNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { fetchTags } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: note, isLoading, error } = useNote(id);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  // tags available for future tag assignment UI
  useQuery({ queryKey: ['tags'], queryFn: fetchTags });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 同步本地状态(笔记加载后)
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  const save = useCallback(async () => {
    if (!id || !note) return;
    setIsSaving(true);
    try {
      await updateNote.mutateAsync({
        id,
        body: {
          title: title || 'Untitled',
          content,
        },
      });
    } finally {
      setIsSaving(false);
    }
  }, [id, note, title, content, updateNote]);

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
      if (title !== note.title || content !== note.content) {
        save();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [title, content]);

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Delete this note? This cannot be undone.')) return;
    await deleteNote.mutateAsync(id);
    navigate('/notes');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-muted-foreground">Note not found</p>
          <button
            onClick={() => navigate('/notes')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            ← Back to notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 标题栏 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/notes')}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Back"
          >
            ←
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-xl font-bold text-foreground outline-none border-none bg-transparent"
            placeholder="Note title..."
          />
          <span className={`text-xs transition-opacity ${isSaving ? 'opacity-100 text-primary' : 'opacity-0'}`}>
            Saving...
          </span>
          <Button size="sm" onClick={save}>Save</Button>
          <Button size="sm" variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {note.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary"># {tag.name}</Badge>
          ))}
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
          使用 [[笔记标题]] 创建双向链接。
        </p>
      </div>

      {/* 侧栏:反向链接 */}
      {id && <BacklinksPanel noteId={id} />}
    </div>
  );
}
