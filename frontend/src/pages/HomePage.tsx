import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchStats, fetchNotes } from '../lib/api';
import NoteList from '../components/notes/NoteList';

export default function HomePage() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: fetchStats });
  const { data: recentNotes } = useQuery({
    queryKey: ['notes', { page: 1, page_size: 6 }],
    queryFn: () => fetchNotes({ page: 1, page_size: 6, sort_by: 'updated_at', sort_desc: true }),
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Notes" value={stats?.total_notes ?? '-'} icon="📝" />
        <StatCard label="Tags" value={stats?.total_tags ?? '-'} icon="🏷️" />
        <StatCard label="Links" value={stats?.total_links ?? '-'} icon="🔗" />
      </div>

      {/* Recent notes */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Recent Notes</h2>
        <Link to="/notes" className="text-sm text-emerald-600 hover:text-emerald-800">
          View all →
        </Link>
      </div>
      <NoteList
        notes={recentNotes?.items ?? []}
        isLoading={!recentNotes}
      />

      {/* Quick tips */}
      <div className="mt-10 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2">💡 Tips</h3>
        <ul className="text-sm text-emerald-700 space-y-1 list-disc pl-5">
          <li>Use <code className="bg-emerald-100 px-1 rounded">[[Note Title]]</code> to create bidirectional links</li>
          <li>Clip web pages using the sidebar button</li>
          <li>Use <code className="bg-emerald-100 px-1 rounded">Ctrl+K</code> to focus the search bar</li>
          <li>Markdown formatting is fully supported in the editor</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
