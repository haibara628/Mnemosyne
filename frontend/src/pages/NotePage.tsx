import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapEditor from '../components/editor/TipTapEditor';
import BacklinksPanel from '../components/layout/BacklinksPanel';
import { useNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { fetchTags } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
// NoteDetail type used implicitly through useNote hook

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

  // Sync local state when note loads
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

  // Auto-save on Ctrl+S
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

  // Debounced auto-save
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
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-gray-500">Note not found</p>
          <button
            onClick={() => navigate('/notes')}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            ← Back to notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/notes')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Back"
          >
            ←
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-xl font-bold text-gray-800 outline-none border-none bg-transparent"
            placeholder="Note title..."
          />
          <span className={`text-xs transition-opacity ${isSaving ? 'opacity-100 text-emerald-600' : 'opacity-0'}`}>
            Saving...
          </span>
          <button
            onClick={save}
            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {note.tags.map((tag) => (
            <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              # {tag.name}
            </span>
          ))}
        </div>

        {/* Editor */}
        <TipTapEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing... Use [[Note Title]] to link to another note."
        />
      </div>

      {/* Side panel: backlinks */}
      {id && <BacklinksPanel noteId={id} />}
    </div>
  );
}
