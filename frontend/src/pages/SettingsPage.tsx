import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchCrawlTasks, fetchSettings, getExportUrl, updateDataDir } from '../lib/api';

export default function SettingsPage() {
  const { data: crawlTasks } = useQuery({
    queryKey: ['crawl-tasks'],
    queryFn: () => fetchCrawlTasks(),
    refetchInterval: 5000,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const [dataDir, setDataDir] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.data_dir && !dataDir) {
      setDataDir(settings.data_dir);
    }
  }, [settings, dataDir]);

  const saveMutation = useMutation({
    mutationFn: (value: string) => updateDataDir(value),
    onSuccess: (res) => setSavedMsg(res.message),
    onError: (err: any) => {
      setSavedMsg(err?.response?.data?.detail ?? '保存失败');
    },
  });

  const handleSave = () => {
    setSavedMsg(null);
    saveMutation.mutate(dataDir.trim());
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      {/* 数据存储位置 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">数据存储位置</h2>
        <div className="space-y-3">
          {settings && (
            <p className="text-xs text-gray-400">
              当前数据目录:<code className="text-gray-600 ml-1">{settings.data_dir}</code>
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={dataDir}
              onChange={(e) => setDataDir(e.target.value)}
              placeholder="/mnt/nas/Mnemosyne/data"
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? '保存中…' : '保存'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            保存后需重启后端生效,数据不会自动迁移;请手动将 data/ 目录移动到新位置。
          </p>
          {savedMsg && (
            <p className={`text-xs ${saveMutation.isError ? 'text-red-500' : 'text-emerald-600'}`}>
              {savedMsg}
            </p>
          )}
        </div>
      </section>

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
