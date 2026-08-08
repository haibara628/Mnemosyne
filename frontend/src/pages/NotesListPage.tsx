import { useSearchParams } from 'react-router-dom';
import { useNoteList } from '../hooks/useNotes';
import NoteList from '../components/notes/NoteList';

export default function NotesListPage() {
  const [searchParams] = useSearchParams();
  const tagId = searchParams.get('tag_id') || undefined;

  const { data, isLoading } = useNoteList({ tag_id: tagId, page_size: 50 });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {tagId ? 'Filtered Notes' : 'All Notes'}
        </h1>
        {tagId && (
          <span className="text-sm text-gray-400">
            Filtering by tag
          </span>
        )}
      </div>

      <NoteList
        notes={data?.items ?? []}
        isLoading={isLoading}
      />

      {data && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          {data.total} note{data.total !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  );
}
