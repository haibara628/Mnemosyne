/** API client for the CPKB backend. */

import axios from 'axios';
import type {
  NoteListResponse,
  NoteDetail,
  NoteCreate,
  NoteUpdate,
  SearchResponse,
  SuggestItem,
  TagWithCount,
  CrawlTask,
  CrawlTaskList,
  GraphData,
  Stats,
  BacklinkInfo,
  OutlinkInfo,
  ArticleListResponse,
  ArticleDetail,
  NewsStats,
  SettingsInfo,
  DataDirUpdateResult,
  ChatModelsResponse,
  AssetListResponse,
  AssetItem,
  AssetCreate,
  AssetUpdate,
  ModelListResponse,
  ModelItem,
  ModelCreate,
  ModelUpdate,
  PromptListResponse,
  PromptItem,
  PromptCreate,
  PromptUpdate,
  TaskListResponse,
  TaskItem,
  TaskCreate,
  TaskUpdate,
  LineageListResponse,
  LineageItem,
  LineageCreate,
  LineageTrace,
} from './types';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// ── Notes ──

export async function fetchNotes(params: {
  page?: number;
  page_size?: number;
  tag_id?: string;
  sort_by?: string;
  sort_desc?: boolean;
} = {}): Promise<NoteListResponse> {
  const { data } = await client.get('/notes', { params });
  return data;
}

export async function fetchNote(id: string): Promise<NoteDetail> {
  const { data } = await client.get(`/notes/${id}`);
  return data;
}

export async function createNote(body: NoteCreate): Promise<NoteDetail> {
  const { data } = await client.post('/notes', body);
  return data;
}

export async function updateNote(id: string, body: NoteUpdate): Promise<NoteDetail> {
  const { data } = await client.put(`/notes/${id}`, body);
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  await client.delete(`/notes/${id}`);
}

export async function fetchBacklinks(id: string): Promise<BacklinkInfo[]> {
  const { data } = await client.get(`/notes/${id}/backlinks`);
  return data;
}

export async function fetchOutlinks(id: string): Promise<OutlinkInfo[]> {
  const { data } = await client.get(`/notes/${id}/outlinks`);
  return data;
}

// ── Search ──

export async function searchNotes(params: {
  q: string;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> {
  const { data } = await client.get('/search', { params });
  return data;
}

export async function suggestNotes(q: string, limit = 8): Promise<SuggestItem[]> {
  const { data } = await client.get('/search/suggest', { params: { q, limit } });
  return data;
}

// ── Tags ──

export async function fetchTags(): Promise<TagWithCount[]> {
  const { data } = await client.get('/tags');
  return data;
}

export async function createTag(name: string): Promise<TagWithCount> {
  const { data } = await client.post('/tags', { name });
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  await client.delete(`/tags/${id}`);
}

// ── Crawl ──

export async function submitCrawl(url: string): Promise<CrawlTask> {
  const { data } = await client.post('/crawl', { url });
  return data;
}

export async function fetchCrawlTasks(status?: string): Promise<CrawlTaskList> {
  const { data } = await client.get('/crawl/tasks', { params: status ? { status } : {} });
  return data;
}

// ── Links / Graph ──

export async function fetchGraph(): Promise<GraphData> {
  const { data } = await client.get('/links/graph');
  return data;
}

// ── Stats ──

export async function fetchStats(): Promise<Stats> {
  const { data } = await client.get('/stats');
  return data;
}

// ── Attachments ──

export async function uploadFile(file: File, noteId?: string) {
  const form = new FormData();
  form.append('file', file);
  if (noteId) form.append('note_id', noteId);
  const { data } = await client.post('/attachments/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Export ──

export function getExportUrl(): string {
  return '/api/v1/export';
}

// ── News ──

export async function fetchNews(params: {
  category?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<ArticleListResponse> {
  const { data } = await client.get('/news', { params });
  return data;
}

export async function fetchNewsStats(): Promise<NewsStats> {
  const { data } = await client.get('/news/stats');
  return data;
}

export async function fetchArticle(id: string): Promise<ArticleDetail> {
  const { data } = await client.get(`/news/${id}`);
  return data;
}

export async function fetchArticleContent(id: string): Promise<ArticleDetail> {
  const { data } = await client.post(`/news/${id}/fetch`);
  return data;
}

// ── Settings ──

export async function fetchSettings(): Promise<SettingsInfo> {
  const { data } = await client.get('/settings');
  return data;
}

export async function updateDataDir(dataDir: string): Promise<DataDirUpdateResult> {
  const { data } = await client.post('/settings/data-dir', { data_dir: dataDir });
  return data;
}

// ── AI Chat ──

export async function fetchChatModels(): Promise<ChatModelsResponse> {
  const { data } = await client.get('/chat/models');
  return data;
}

// ── Assets (素材) ──

export async function fetchAssets(params: {
  page?: number;
  page_size?: number;
  type?: string;
} = {}): Promise<AssetListResponse> {
  const { data } = await client.get('/assets', { params });
  return data;
}

export async function createAsset(body: AssetCreate): Promise<AssetItem> {
  const { data } = await client.post('/assets', body);
  return data;
}

export async function updateAsset(id: string, body: AssetUpdate): Promise<AssetItem> {
  const { data } = await client.put(`/assets/${id}`, body);
  return data;
}

export async function deleteAsset(id: string): Promise<void> {
  await client.delete(`/assets/${id}`);
}

// ── Models (模型) ──

export async function fetchModels(params: {
  page?: number;
  page_size?: number;
  kind?: string;
} = {}): Promise<ModelListResponse> {
  const { data } = await client.get('/models', { params });
  return data;
}

export async function createModel(body: ModelCreate): Promise<ModelItem> {
  const { data } = await client.post('/models', body);
  return data;
}

export async function updateModel(id: string, body: ModelUpdate): Promise<ModelItem> {
  const { data } = await client.put(`/models/${id}`, body);
  return data;
}

export async function deleteModel(id: string): Promise<void> {
  await client.delete(`/models/${id}`);
}

// ── Prompts (提示词) ──

export async function fetchPrompts(params: {
  page?: number;
  page_size?: number;
} = {}): Promise<PromptListResponse> {
  const { data } = await client.get('/prompts', { params });
  return data;
}

export async function createPrompt(body: PromptCreate): Promise<PromptItem> {
  const { data } = await client.post('/prompts', body);
  return data;
}

export async function updatePrompt(id: string, body: PromptUpdate): Promise<PromptItem> {
  const { data } = await client.put(`/prompts/${id}`, body);
  return data;
}

export async function deletePrompt(id: string): Promise<void> {
  await client.delete(`/prompts/${id}`);
}

// ── Tasks (任务) ──

export async function fetchTasks(params: {
  page?: number;
  page_size?: number;
  status?: string;
  project?: string;
} = {}): Promise<TaskListResponse> {
  const { data } = await client.get('/tasks', { params });
  return data;
}

export async function createTask(body: TaskCreate): Promise<TaskItem> {
  const { data } = await client.post('/tasks', body);
  return data;
}

export async function updateTask(id: string, body: TaskUpdate): Promise<TaskItem> {
  const { data } = await client.put(`/tasks/${id}`, body);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await client.delete(`/tasks/${id}`);
}

// ── Lineage (血缘) ──

export async function fetchLineage(params: {
  page?: number;
  page_size?: number;
  source_type?: string;
  source_id?: string;
  target_type?: string;
  target_id?: string;
  relation?: string;
} = {}): Promise<LineageListResponse> {
  const { data } = await client.get('/lineage', { params });
  return data;
}

export async function createLineage(body: LineageCreate): Promise<LineageItem> {
  const { data } = await client.post('/lineage', body);
  return data;
}

export async function deleteLineage(id: string): Promise<void> {
  await client.delete(`/lineage/${id}`);
}

export async function traceLineage(type: string, id: string): Promise<LineageTrace> {
  const { data } = await client.get('/lineage/trace', { params: { type, id } });
  return data;
}
