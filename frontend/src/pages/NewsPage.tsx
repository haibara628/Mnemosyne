import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNews, fetchNewsStats, fetchArticle, fetchArticleContent } from '../lib/api';
import type { Article } from '../lib/types';

const CATEGORIES = [
  { key: 'all', label: '全部', icon: '📰' },
  { key: 'tech', label: '科技', icon: '💻' },
  { key: 'ai', label: 'AI', icon: '🤖' },
  { key: 'finance', label: '金融', icon: '💰' },
];

const CATEGORY_BADGE: Record<string, string> = {
  tech: 'bg-blue-50 text-blue-600',
  ai: 'bg-purple-50 text-purple-600',
  finance: 'bg-amber-50 text-amber-600',
};

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 1) return `${Math.max(1, Math.round(diffH * 60))} 分钟前`;
  if (diffH < 24) return `${Math.round(diffH)} 小时前`;
  return `${Math.round(diffH / 24)} 天前`;
}

export default function NewsPage() {
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ['news-stats'], queryFn: fetchNewsStats });
  const { data, isLoading } = useQuery({
    queryKey: ['news', category],
    queryFn: () => fetchNews({ category: category === 'all' ? undefined : category, page_size: 100 }),
  });
  const { data: detail } = useQuery({
    queryKey: ['news-detail', selectedId],
    queryFn: () => fetchArticle(selectedId!),
    enabled: !!selectedId,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-800">📰 资讯</h1>
          {stats?.last_collected_at && (
            <span className="text-xs text-gray-400">
              上次采集 {formatTime(stats.last_collected_at)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-5">
          每小时自动采集科技 / AI / 金融资讯，按「权威性 · 热度 · 重要性」综合排序
        </p>

        {/* Category tabs */}
        <div className="flex gap-2 mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                category === c.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.icon} {c.label}
              {stats && (
                <span className="ml-1 text-xs opacity-70">
                  {c.key === 'all' ? stats.total : stats.by_category[c.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-16">加载中…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            暂无资讯，等待首次定时采集（或稍后刷新）
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                active={selectedId === a.id}
                onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <ArticleDetailPanel id={selectedId} detail={detail} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function ArticleCard({ article, active, onClick }: { article: Article; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-colors ${
        active ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE[article.category] ?? 'bg-gray-100 text-gray-500'}`}>
              {article.category}
            </span>
            <span className="text-xs text-gray-400">{article.source}</span>
            <span className="text-xs text-gray-300">· {formatTime(article.published_at)}</span>
          </div>
          <h3 className="text-[15px] font-medium text-gray-800 leading-snug mb-1">{article.title}</h3>
          {article.summary && (
            <p className="text-sm text-gray-500 line-clamp-2">{article.summary}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-sm font-semibold text-emerald-600">{Math.round(article.score)}</span>
          {article.readership > 0 && (
            <span className="text-xs text-orange-500">🔥 {article.readership}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ArticleDetailPanel({ id, detail, onClose }: { id: string; detail: any; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchContent = useMutation({
    mutationFn: () => fetchArticleContent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news-detail', id] }),
  });

  return (
    <div className="fixed inset-y-0 right-0 w-[46rem] max-w-full bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        <div className="pr-4">
          <h2 className="text-lg font-semibold text-gray-800 leading-snug">{detail?.title}</h2>
          {detail && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
              <span>{detail.source}</span>
              <span>· {formatTime(detail.published_at)}</span>
              <span>· 综合分 {Math.round(detail.score)}</span>
              {detail.readership > 0 && <span className="text-orange-500">· 🔥 {detail.readership}</span>}
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">✕</button>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
        <a
          href={detail?.url}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
        >
          查看原文 ↗
        </a>
        <button
          onClick={() => fetchContent.mutate()}
          disabled={fetchContent.isPending}
          className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {fetchContent.isPending ? '抓取中…' : detail?.has_content ? '重新抓取全文' : '抓取全文'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {fetchContent.isError ? (
          <div className="text-sm text-red-500">抓取失败：{(fetchContent.error as any)?.message ?? '未知错误'}</div>
        ) : detail?.summary && !detail.content ? (
          <p className="text-sm text-gray-600">{detail.summary}</p>
        ) : detail?.content ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{detail.content}</pre>
        ) : (
          <div className="text-sm text-gray-400">点击「抓取全文」拉取正文</div>
        )}
      </div>
    </div>
  );
}
