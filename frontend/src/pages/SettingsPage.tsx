import { useQuery } from '@tanstack/react-query';
import { fetchCrawlTasks, getExportUrl } from '../lib/api';

export default function SettingsPage() {
  const { data: crawlTasks } = useQuery({
    queryKey: ['crawl-tasks'],
    queryFn: () => fetchCrawlTasks(),
    refetchInterval: 5000,
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      {/* Data Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Data Management</h2>
        <div className="space-y-3">
          <a
            href={getExportUrl()}
            className="inline-block px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            download
          >
            📥 Export All Notes (ZIP)
          </a>
          <p className="text-xs text-gray-400">
            Export all notes as individual Markdown files in a ZIP archive.
          </p>
        </div>
      </section>

      {/* Crawl Tasks */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Web Crawl Queue</h2>
        {crawlTasks && crawlTasks.items.length > 0 ? (
          <div className="space-y-2">
            {crawlTasks.items.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border text-sm ${
                  task.status === 'done'
                    ? 'border-emerald-200 bg-emerald-50'
                    : task.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 truncate max-w-md">
                    {task.title || task.url}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'done'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
                {task.error_msg && (
                  <p className="text-xs text-red-500 mt-1">{task.error_msg}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No crawl tasks yet.</p>
        )}
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">About CPKB</h2>
        <div className="p-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 space-y-1">
          <p><strong>Phase 1:</strong> Notes + Bidirectional Links + Full-Text Search + Web Clipping</p>
          <p><strong>Phase 2 (planned):</strong> Graph Visualization, Block References, Version History, Chrome Extension</p>
          <p><strong>Phase 3 (planned):</strong> RAG Q&A, Auto-tagging, Knowledge Gap Analysis, AI Writing (Claude API)</p>
        </div>
      </section>
    </div>
  );
}
