/** Core types for the CPKB frontend. */

export interface TagOut {
  id: string;
  name: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  is_pinned: boolean;
  tags: TagOut[];
  created_at: string;
  updated_at: string;
}

export interface BacklinkInfo {
  note_id: string;
  note_title: string;
  context: string | null;
}

export interface OutlinkInfo {
  note_id: string;
  note_title: string;
  context: string | null;
}

export interface NoteDetail {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  tags: TagOut[];
  backlinks: BacklinkInfo[];
  outlinks: OutlinkInfo[];
  created_at: string;
  updated_at: string;
}

export interface NoteListResponse {
  items: NoteSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface NoteCreate {
  title: string;
  content: string;
  tag_ids: string[];
}

export interface NoteUpdate {
  title?: string | null;
  content?: string | null;
  is_pinned?: boolean | null;
  tag_ids?: string[] | null;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

export interface SuggestItem {
  id: string;
  title: string;
}

export interface TagWithCount {
  id: string;
  name: string;
  note_count: number;
}

export interface CrawlTask {
  id: string;
  url: string;
  title: string | null;
  status: string;
  note_id: string | null;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface CrawlTaskList {
  items: CrawlTask[];
  total: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  context: string | null;
}

export interface Stats {
  total_notes: number;
  total_tags: number;
  total_links: number;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  published_at: string;
  score: number;
  authority: number;
  readership: number;
  importance: number;
  has_content: boolean;
  created_at: string;
}

export interface ArticleDetail extends Article {
  content: string | null;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  page_size: number;
}

export interface NewsStats {
  total: number;
  by_category: Record<string, number>;
  last_collected_at: string | null;
}
