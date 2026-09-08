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
