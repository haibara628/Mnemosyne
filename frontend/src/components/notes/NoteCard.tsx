import { Link } from 'react-router-dom';
import type { NoteSummary } from '../../lib/types';

interface NoteCardProps {
  note: NoteSummary;
}

export default function NoteCard({ note }: NoteCardProps) {
  return (
    <Link
      to={`/notes/${note.id}`}
      className="block p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-1">
          {note.is_pinned && '📌 '}
          {note.title || 'Untitled'}
        </h3>
      </div>
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-500"
            >
              # {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-400">
        Updated {formatDate(note.updated_at)}
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}
