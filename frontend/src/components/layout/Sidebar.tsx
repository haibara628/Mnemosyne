import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTags, submitCrawl } from '../../lib/api';
import { useCreateNote } from '../../hooks/useNotes';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const createNote = useCreateNote();
  const [crawlUrl, setCrawlUrl] = useState('');
  const [showCrawl, setShowCrawl] = useState(false);

  const handleNewNote = async () => {
    const note = await createNote.mutateAsync({
      title: 'Untitled',
      content: '',
      tag_ids: [],
    });
    navigate(`/notes/${note.id}`);
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    await submitCrawl(crawlUrl.trim());
    setCrawlUrl('');
    setShowCrawl(false);
  };

  const isActive = (path: string) =>
    location.pathname === path ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50';

  return (
    <aside className="w-60 h-screen border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <Link to="/" className="text-lg font-bold text-gray-800 tracking-tight">
          🧠 CPKB
        </Link>
        <p className="text-xs text-gray-400 mt-0.5">Personal Knowledge Base</p>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-1.5">
        <button
          onClick={handleNewNote}
          className="w-full py-2 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          + New Note
        </button>
        <button
          onClick={() => setShowCrawl(!showCrawl)}
          className="w-full py-2 px-3 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          🌐 Clip Web Page
        </button>
        {showCrawl && (
          <div className="flex gap-1.5">
            <input
              type="url"
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-emerald-400"
              onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
            />
            <button
              onClick={handleCrawl}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
            >
              Go
            </button>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        <Link
          to="/"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/')}`}
        >
          📊 Dashboard
        </Link>
        <Link
          to="/notes"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/notes') || location.pathname.startsWith('/notes/')}`}
        >
          📝 All Notes
        </Link>
        <Link
          to="/news"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/news')}`}
        >
          📰 资讯
        </Link>
        <Link
          to="/search"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/search')}`}
        >
          🔍 Search
        </Link>
        <Link
          to="/graph"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/graph')}`}
        >
          🕸️ Graph
        </Link>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Tags
            </div>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/notes?tag_id=${tag.id}`}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span># {tag.name}</span>
                <span className="text-xs text-gray-300">{tag.note_count}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <Link
          to="/settings"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/settings')}`}
        >
          ⚙️ Settings
        </Link>
      </div>
    </aside>
  );
}
