import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLineage,
  deleteLineage,
  fetchAssets,
  fetchLineage,
  fetchModels,
  fetchPrompts,
  fetchTasks,
  traceLineage,
} from '../lib/api';
import type { LineageItem, LineageTrace } from '../lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ENTITY_TYPES = ['asset', 'model', 'prompt', 'task', 'note', 'project'] as const;

const ENTITY_TYPE_LABEL: Record<string, string> = {
  asset: '素材',
  model: '模型',
  prompt: '提示词',
  task: '任务',
  note: '笔记',
  project: '项目',
};

const ENTITY_TYPE_BADGE: Record<string, string> = {
  asset: 'bg-blue-50 text-blue-600',
  model: 'bg-emerald-50 text-emerald-600',
  prompt: 'bg-amber-50 text-amber-600',
  task: 'bg-violet-50 text-violet-600',
  note: 'bg-gray-100 text-gray-600',
  project: 'bg-pink-50 text-pink-600',
};

const ENTITY_TYPE_COLOR: Record<string, string> = {
  asset: '#2563eb',
  model: '#059669',
  prompt: '#d97706',
  task: '#7c3aed',
  note: '#6b7280',
  project: '#db2777',
};

const RELATION_LABEL: Record<string, string> = {
  derived_from: '衍生自',
  generated_by: '由…生成',
  uses_prompt: '使用提示词',
  uses: '使用',
  part_of: '组成部分',
  belongs_to: '归属',
};

const COMMON_RELATIONS = ['derived_from', 'generated_by', 'uses_prompt', 'uses', 'part_of', 'belongs_to'];

const SELECT_CLS =
  'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function errMsg(err: unknown): string {
  const e = err as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail ?? e?.message ?? '未知错误';
}

function relationText(rel: string): string {
  return RELATION_LABEL[rel] ?? rel;
}

function truncateLabel(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StateHint({ children }: { children: ReactNode }) {
  return <div className="text-center text-gray-400 py-12 text-sm">{children}</div>;
}

function ConfirmDialog({
  open,
  title,
  description,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? '删除中…' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntityCell({ type, id }: { type: string; id: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Badge className={ENTITY_TYPE_BADGE[type] ?? 'bg-gray-100 text-gray-600'}>
        {ENTITY_TYPE_LABEL[type] ?? type}
      </Badge>
      <span className="truncate font-mono text-xs text-gray-600" title={id}>
        {id}
      </span>
    </div>
  );
}

function EntityPicker({
  type,
  value,
  onChange,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const assetsQ = useQuery({
    queryKey: ['entity-options', 'asset'],
    queryFn: () => fetchAssets({ page_size: 200 }),
    enabled: type === 'asset',
    staleTime: 60_000,
  });
  const modelsQ = useQuery({
    queryKey: ['entity-options', 'model'],
    queryFn: () => fetchModels({ page_size: 200 }),
    enabled: type === 'model',
    staleTime: 60_000,
  });
  const promptsQ = useQuery({
    queryKey: ['entity-options', 'prompt'],
    queryFn: () => fetchPrompts({ page_size: 200 }),
    enabled: type === 'prompt',
    staleTime: 60_000,
  });
  const tasksQ = useQuery({
    queryKey: ['entity-options', 'task'],
    queryFn: () => fetchTasks({ page_size: 200 }),
    enabled: type === 'task',
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    if (type === 'asset') return (assetsQ.data?.items ?? []).map((a) => ({ id: a.id, label: a.title || a.id }));
    if (type === 'model') return (modelsQ.data?.items ?? []).map((m) => ({ id: m.id, label: m.name || m.id }));
    if (type === 'prompt') return (promptsQ.data?.items ?? []).map((p) => ({ id: p.id, label: p.title || p.id }));
    if (type === 'task') return (tasksQ.data?.items ?? []).map((t) => ({ id: t.id, label: t.title || t.id }));
    return [];
  }, [type, assetsQ.data, modelsQ.data, promptsQ.data, tasksQ.data]);

  if (type === 'note' || type === 'project') {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={type === 'project' ? '项目名(自由文本 id)' : '笔记 id'}
      />
    );
  }

  const isLoading =
    (type === 'asset' && assetsQ.isLoading) ||
    (type === 'model' && modelsQ.isLoading) ||
    (type === 'prompt' && promptsQ.isLoading) ||
    (type === 'task' && tasksQ.isLoading);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
      <option value="">{isLoading ? '加载中…' : '请选择实体…'}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function LineagePage() {
  const [tab, setTab] = useState('list');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">🔗 血缘</h1>
      <p className="text-sm text-gray-400 mb-5">管理实体间的生成链路,并追溯上下游血缘</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">血缘关系</TabsTrigger>
          <TabsTrigger value="trace">追溯图</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <LineageListTab />
        </TabsContent>
        <TabsContent value="trace">
          <LineageTraceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 血缘关系列表 ──

function LineageListTab() {
  const qc = useQueryClient();
  const [relFilter, setRelFilter] = useState('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<LineageItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lineage', relFilter, sourceTypeFilter, targetTypeFilter],
    queryFn: () =>
      fetchLineage({
        page_size: 100,
        relation: relFilter === 'all' ? undefined : relFilter,
        source_type: sourceTypeFilter === 'all' ? undefined : sourceTypeFilter,
        target_type: targetTypeFilter === 'all' ? undefined : targetTypeFilter,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLineage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lineage'] });
      setDeleting(null);
    },
  });

  const items = data?.items ?? [];

  const cancelDelete = () => {
    setDeleting(null);
    deleteMutation.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <Field label="关系">
            <select
              value={relFilter}
              onChange={(e) => setRelFilter(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="all">全部</option>
              {COMMON_RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {relationText(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="源类型">
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="all">全部</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTITY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="目标类型">
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="all">全部</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTITY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button onClick={() => setFormOpen(true)}>新建血缘边</Button>
      </div>

      {deleteMutation.isError && (
        <p className="text-sm text-red-500">删除失败:{errMsg(deleteMutation.error)}</p>
      )}

      {isLoading ? (
        <StateHint>加载中…</StateHint>
      ) : isError ? (
        <StateHint>加载失败,请稍后重试</StateHint>
      ) : items.length === 0 ? (
        <StateHint>暂无血缘边,点击「新建血缘边」建立第一条关系</StateHint>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>源实体</TableHead>
                <TableHead>关系</TableHead>
                <TableHead>目标实体</TableHead>
                <TableHead>说明</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <EntityCell type={e.source_type} id={e.source_id} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm" title={e.relation}>
                      <span className="text-emerald-600 font-medium">→</span>
                      <span>{relationText(e.relation)}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <EntityCell type={e.target_type} id={e.target_id} />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[240px] truncate text-gray-500" title={e.context ?? ''}>
                      {e.context || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">{formatDate(e.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleting(e)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateLineageDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ['lineage'] })}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除血缘边"
        description={`确定删除「${deleting ? `${ENTITY_TYPE_LABEL[deleting.source_type] ?? deleting.source_type} → ${ENTITY_TYPE_LABEL[deleting.target_type] ?? deleting.target_type}` : '该血缘边'}」吗?此操作不可撤销。`}
        pending={deleteMutation.isPending}
        onCancel={cancelDelete}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function CreateLineageDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sourceType, setSourceType] = useState('asset');
  const [sourceId, setSourceId] = useState('');
  const [targetType, setTargetType] = useState('model');
  const [targetId, setTargetId] = useState('');
  const [relation, setRelation] = useState('generated_by');
  const [context, setContext] = useState('');

  useEffect(() => {
    if (!open) return;
    setSourceType('asset');
    setSourceId('');
    setTargetType('model');
    setTargetId('');
    setRelation('generated_by');
    setContext('');
  }, [open]);

  const mutation = useMutation({
    mutationFn: createLineage,
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  const canSubmit = sourceId.trim() !== '' && targetId.trim() !== '' && relation.trim() !== '';

  const handleSubmit = () => {
    mutation.mutate({
      source_type: sourceType,
      source_id: sourceId.trim(),
      target_type: targetType,
      target_id: targetId.trim(),
      relation: relation.trim(),
      context: context.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建血缘边</DialogTitle>
          <DialogDescription>连接两个实体,描述它们之间的生成 / 使用关系</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="源类型">
              <select
                value={sourceType}
                onChange={(e) => {
                  setSourceType(e.target.value);
                  setSourceId('');
                }}
                className={SELECT_CLS}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ENTITY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="源实体">
              <EntityPicker type={sourceType} value={sourceId} onChange={setSourceId} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="目标类型">
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setTargetId('');
                }}
                className={SELECT_CLS}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ENTITY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="目标实体">
              <EntityPicker type={targetType} value={targetId} onChange={setTargetId} />
            </Field>
          </div>

          <Field label="关系">
            <Input
              list="lineage-relation-options"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="如 generated_by / uses_prompt / derived_from"
            />
            <datalist id="lineage-relation-options">
              {COMMON_RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {relationText(r)}
                </option>
              ))}
            </datalist>
          </Field>

          <Field label="说明(可选)">
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="补充上下文,如生成参数、批次、版本等"
              className="min-h-[80px]"
            />
          </Field>
        </div>

        {mutation.isError && (
          <p className="mt-3 text-sm text-red-500">创建失败:{errMsg(mutation.error)}</p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? '创建中…' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 追溯图 ──

const NODE_W = 176;
const NODE_H = 56;
const COL_W = 260;
const ROW_GAP = 24;
const MARGIN = 48;

interface NodePos {
  x: number;
  y: number;
}

interface TraceLayout {
  positions: Record<string, NodePos>;
  width: number;
  height: number;
}

function computeLayout(trace: LineageTrace): TraceLayout {
  const { nodes, edges } = trace;

  const inDeg: Record<string, number> = {};
  const out: Record<string, string[]> = {};
  nodes.forEach((n) => {
    inDeg[n.key] = 0;
    out[n.key] = [];
  });
  edges.forEach((e) => {
    inDeg[e.target] = (inDeg[e.target] ?? 0) + 1;
    (out[e.source] ??= []).push(e.target);
  });

  const level: Record<string, number> = {};
  const indegCopy = { ...inDeg };
  const queue: string[] = [];
  nodes.forEach((n) => {
    if (!inDeg[n.key]) {
      level[n.key] = 0;
      queue.push(n.key);
    }
  });

  let qi = 0;
  while (qi < queue.length) {
    const k = queue[qi++];
    for (const t of out[k] ?? []) {
      level[t] = Math.max(level[t] ?? 0, (level[k] ?? 0) + 1);
      indegCopy[t] -= 1;
      if (indegCopy[t] === 0) queue.push(t);
    }
  }
  nodes.forEach((n) => {
    if (level[n.key] === undefined) level[n.key] = 0;
  });

  const groups: Record<number, string[]> = {};
  let maxLevel = 0;
  nodes.forEach((n) => {
    const l = level[n.key];
    (groups[l] ??= []).push(n.key);
    maxLevel = Math.max(maxLevel, l);
  });

  let height = 320;
  Object.values(groups).forEach((keys) => {
    height = Math.max(height, keys.length * NODE_H + (keys.length - 1) * ROW_GAP);
  });
  height += MARGIN * 2;

  const positions: Record<string, NodePos> = {};
  Object.entries(groups).forEach(([lv, keys]) => {
    const l = Number(lv);
    const groupH = keys.length * NODE_H + (keys.length - 1) * ROW_GAP;
    const startY = (height - groupH) / 2;
    keys.forEach((key, i) => {
      positions[key] = {
        x: MARGIN + l * COL_W,
        y: startY + i * (NODE_H + ROW_GAP) + NODE_H / 2,
      };
    });
  });

  const width = Math.max(400, MARGIN * 2 + maxLevel * COL_W + NODE_W);
  return { positions, width, height };
}

function LineageTraceTab() {
  const navigate = useNavigate();
  const [type, setType] = useState('asset');
  const [entityId, setEntityId] = useState('');
  const [query, setQuery] = useState<{ type: string; id: string } | null>(null);

  const { data: trace, isLoading, isError, error } = useQuery({
    queryKey: ['lineage-trace', query?.type, query?.id],
    queryFn: () => traceLineage(query!.type, query!.id),
    enabled: !!query,
  });

  const layout = useMemo(() => (trace ? computeLayout(trace) : null), [trace]);

  const rootKey = query ? `${query.type}:${query.id}` : null;

  const runTrace = () => {
    if (!entityId.trim()) return;
    setQuery({ type, id: entityId.trim() });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="实体类型">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setEntityId('');
            }}
            className={SELECT_CLS}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <div className="min-w-[260px]">
          <Field label="实体">
            <EntityPicker type={type} value={entityId} onChange={setEntityId} />
          </Field>
        </div>
        <Button onClick={runTrace} disabled={!entityId.trim() || isLoading}>
          {isLoading ? '追溯中…' : '追溯'}
        </Button>
      </div>

      {isError ? (
        <StateHint>追溯失败:{errMsg(error)}</StateHint>
      ) : !query ? (
        <StateHint>选择实体类型与实体后,点击「追溯」查看血缘链路</StateHint>
      ) : !trace || !layout || trace.nodes.length === 0 ? (
        <StateHint>该实体暂无血缘链路</StateHint>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <p className="text-sm text-gray-500">
              {trace.nodes.length} 个节点,{trace.edges.length} 条边 — 绿色为起点,笔记节点可点击跳转
            </p>
            {trace.edges.length === 0 && (
              <p className="text-sm text-gray-400">该实体暂无下游血缘边</p>
            )}
          </div>
          <div
            className="rounded-xl border border-gray-200 bg-[#fafbfc] overflow-auto"
            style={{ maxHeight: 'calc(100vh - 340px)' }}
          >
            <svg width={layout.width} height={layout.height}>
              <defs>
                <marker
                  id="lineage-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                </marker>
              </defs>

              {trace.edges.map((e, i) => {
                const s = layout.positions[e.source];
                const t = layout.positions[e.target];
                if (!s || !t) return null;
                const sx = s.x + NODE_W / 2;
                const tx = t.x - NODE_W / 2;
                const midX = (sx + tx) / 2;
                const midY = (s.y + t.y) / 2;
                return (
                  <g key={i}>
                    <line
                      x1={sx}
                      y1={s.y}
                      x2={tx}
                      y2={t.y}
                      stroke="#d1d5db"
                      strokeWidth={1.5}
                      markerEnd="url(#lineage-arrow)"
                    />
                    <text
                      x={midX}
                      y={midY - 7}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#9ca3af"
                      stroke="#fafbfc"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {truncateLabel(relationText(e.relation), 16)}
                    </text>
                  </g>
                );
              })}

              {trace.nodes.map((n) => {
                const p = layout.positions[n.key];
                if (!p) return null;
                const isRoot = n.key === rootKey;
                const clickable = n.type === 'note';
                const label = truncateLabel(n.label || n.id || '—', 20);
                return (
                  <g
                    key={n.key}
                    transform={`translate(${p.x}, ${p.y})`}
                    onClick={clickable ? () => navigate(`/notes/${n.id}`) : undefined}
                    style={clickable ? { cursor: 'pointer' } : undefined}
                  >
                    <rect
                      x={-NODE_W / 2}
                      y={-NODE_H / 2}
                      width={NODE_W}
                      height={NODE_H}
                      rx={8}
                      fill={isRoot ? '#ecfdf5' : '#ffffff'}
                      stroke={isRoot ? '#059669' : '#e5e7eb'}
                      strokeWidth={isRoot ? 2 : 1}
                    />
                    <text
                      x={-NODE_W / 2 + 10}
                      y={-10}
                      fontSize={10}
                      fontWeight={600}
                      fill={ENTITY_TYPE_COLOR[n.type] ?? '#6b7280'}
                    >
                      {ENTITY_TYPE_LABEL[n.type] ?? n.type}
                    </text>
                    <text x={-NODE_W / 2 + 10} y={12} fontSize={12} fill="#1f2937">
                      {label}
                    </text>
                    <title>{`${n.key} — ${n.label || '—'}${clickable ? '(点击跳转)' : ''}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
