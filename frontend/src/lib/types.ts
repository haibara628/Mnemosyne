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

export interface SettingsInfo {
  data_dir: string;
  database_url: string;
  upload_dir: string;
  version: string;
}

export interface DataDirUpdateResult {
  data_dir: string;
  restart_required: boolean;
  message: string;
}

export interface ChatModel {
  id: string;
  provider: string;
  name: string;
}

export interface ChatModelsResponse {
  models: ChatModel[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
}

// ── Assets (素材) ──

export interface AssetItem {
  id: string;
  type: string; // image | video | text | prompt | model
  title: string;
  path: string;
  eagle_id: string | null;
  created_at: string;
}

export interface AssetListResponse {
  items: AssetItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AssetCreate {
  type?: string;
  title?: string;
  path?: string;
  eagle_id?: string | null;
}

export interface AssetUpdate {
  type?: string | null;
  title?: string | null;
  path?: string | null;
  eagle_id?: string | null;
}

// ── Models (模型) ──

export interface ModelItem {
  id: string;
  name: string;
  kind: string; // checkpoint | lora | vae | embedding | ...
  path: string;
  created_at: string;
}

export interface ModelListResponse {
  items: ModelItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModelCreate {
  name?: string;
  kind?: string;
  path?: string;
}

export interface ModelUpdate {
  name?: string | null;
  kind?: string | null;
  path?: string | null;
}

// ── Prompts (提示词) ──

export interface PromptItem {
  id: string;
  title: string;
  text: string;
  tags: string; // 逗号分隔标签
  created_at: string;
}

export interface PromptListResponse {
  items: PromptItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PromptCreate {
  title?: string;
  text?: string;
  tags?: string;
}

export interface PromptUpdate {
  title?: string | null;
  text?: string | null;
  tags?: string | null;
}

// ── Tasks (任务) ──

export interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  items: TaskItem[];
  total: number;
  page: number;
  page_size: number;
}

// ── Lineage (血缘) ──

export interface LineageItem {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relation: string;
  context: string | null;
  created_at: string;
}

export interface LineageListResponse {
  items: LineageItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface LineageCreate {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relation: string;
  context?: string | null;
}

export interface LineageTraceNode {
  key: string;
  type: string;
  id: string;
  label: string | null;
}

export interface LineageTraceEdge {
  source: string;
  target: string;
  relation: string;
}

export interface LineageTrace {
  nodes: LineageTraceNode[];
  edges: LineageTraceEdge[];
}
