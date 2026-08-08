import { Link } from 'react-router-dom';
import { useBacklinks, useOutlinks } from '../../hooks/useLinks';

interface BacklinksPanelProps {
  noteId: string;
}

export default function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const { data: backlinks, isLoading: blLoading } = useBacklinks(noteId);
  const { data: outlinks, isLoading: olLoading } = useOutlinks(noteId);

  return (
    <div className="w-64 border-l border-gray-200 bg-gray-50/50 h-full overflow-y-auto p-4 space-y-6">
      {/* Outgoing links */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Links Out ({outlinks?.length ?? 0})
        </h3>
        {olLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : outlinks && outlinks.length > 0 ? (
          <ul className="space-y-1">
            {outlinks.map((link) => (
              <li key={link.note_id}>
                <Link
                  to={`/notes/${link.note_id}`}
                  className="block text-sm text-emerald-600 hover:text-emerald-800 hover:underline truncate"
                >
                  {link.note_title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 italic">No outgoing links</p>
        )}
      </section>

      {/* Backlinks (incoming) */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Backlinks ({backlinks?.length ?? 0})
        </h3>
        {blLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : backlinks && backlinks.length > 0 ? (
          <ul className="space-y-2">
            {backlinks.map((link) => (
              <li key={link.note_id}>
                <Link
                  to={`/notes/${link.note_id}`}
                  className="block p-2 rounded-md border border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 block truncate">
                    {link.note_title}
                  </span>
                  {link.context && (
                    <span className="text-xs text-gray-400 block truncate mt-0.5">
                      {link.context}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 italic">No backlinks yet</p>
        )}
      </section>
    </div>
  );
}
