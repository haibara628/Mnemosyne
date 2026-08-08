import NoteCard from './NoteCard';
import type { NoteSummary } from '../../lib/types';

interface NoteListProps {
  notes: NoteSummary[];
  isLoading: boolean;
}

export default function NoteList({ notes, isLoading }: NoteListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-2">📝</p>
        <p className="text-sm">No notes yet. Create your first note!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
