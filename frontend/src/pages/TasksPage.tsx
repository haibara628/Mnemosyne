import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { createTask, deleteTask, fetchTasks, updateTask } from '../lib/api';
import type { TaskCreate, TaskItem } from '../lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const STATUS_OPTIONS = ['todo', 'doing', 'done'] as const;

const STATUS_LABEL: Record<string, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
};

const STATUS_BADGE: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  doing: 'bg-amber-50 text-amber-600',
  done: 'bg-emerald-50 text-emerald-600',
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

const PRIORITY_LABEL: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-red-50 text-red-600',
};

const SELECT_CLS =
  'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 提取 due_date 中的 YYYY-MM-DD 前缀,兼容带时间戳的字符串。 */
function toDateKey(due?: string | null): string | null {
  if (!due) return null;
  const m = due.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatToday(): string {
  const d = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`;
}

/** 未完成在前,due_date 靠前在前(无日期垫底)。 */
function sortTasks(a: TaskItem, b: TaskItem): number {
  const aDone = a.status === 'done' ? 1 : 0;
  const bDone = b.status === 'done' ? 1 : 0;
  if (aDone !== bDone) return aDone - bDone;
  const aDue = toDateKey(a.due_date) ?? '9999-12-31';
  const bDue = toDateKey(b.due_date) ?? '9999-12-31';
  if (aDue !== bDue) return aDue < bDue ? -1 : 1;
  return 0;
}

function errMsg(err: unknown): string {
  const e = err as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail ?? e?.message ?? '未知错误';
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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
        active ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function DoneIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
  ) : (
    <Circle className="size-5 text-gray-300 shrink-0" />
  );
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

export default function TasksPage() {
  const [tab, setTab] = useState('list');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">📅 日程</h1>
      <p className="text-sm text-gray-400 mb-5">个人任务与待办:状态、优先级、截止日期与所属项目</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">任务列表</TabsTrigger>
          <TabsTrigger value="schedule">日程</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <TaskListTab />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 任务列表 ──

function TaskListTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [deleting, setDeleting] = useState<TaskItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks({ page_size: 500 }),
  });

  const toggleMutation = useMutation({
    mutationFn: (t: TaskItem) =>
      updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const saveMutation = useMutation({
    mutationFn: (values: TaskCreate) =>
      editing ? updateTask(editing.id, values) : createTask(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setDeleting(null);
    },
  });

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    const q = projectFilter.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.project ?? '').toLowerCase().includes(q));
    return [...list].sort(sortTasks);
  }, [data, statusFilter, projectFilter]);

  const today = todayKey();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: TaskItem) => {
    setEditing(t);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    saveMutation.reset();
  };
  const cancelDelete = () => {
    setDeleting(null);
    deleteMutation.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            全部
          </FilterPill>
          {STATUS_OPTIONS.map((s) => (
            <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {STATUS_LABEL[s]}
            </FilterPill>
          ))}
          <Input
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            placeholder="按项目过滤…"
            className="h-9 w-40"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新建任务
        </Button>
      </div>

      {(toggleMutation.isError || deleteMutation.isError) && (
        <p className="text-sm text-red-500">
          操作失败:{errMsg(toggleMutation.error ?? deleteMutation.error)}
        </p>
      )}

      {isLoading ? (
        <StateHint>加载中…</StateHint>
      ) : isError ? (
        <StateHint>加载失败,请稍后重试</StateHint>
      ) : items.length === 0 ? (
        <StateHint>暂无任务,点击「新建任务」添加</StateHint>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>标题</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>截止日期</TableHead>
                <TableHead>项目</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => {
                const due = toDateKey(t.due_date);
                const overdue = !!due && due < today && t.status !== 'done';
                const done = t.status === 'done';
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(t)}
                        disabled={toggleMutation.isPending}
                        title={done ? '标记为待办' : '标记为完成'}
                        className="disabled:opacity-50"
                      >
                        <DoneIcon done={done} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`max-w-[260px] truncate font-medium ${
                          done ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}
                        title={t.title}
                      >
                        {t.title || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_BADGE[t.priority] ?? 'bg-gray-100 text-gray-600'}>
                        {PRIORITY_LABEL[t.priority] ?? t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[t.status] ?? 'bg-gray-100 text-gray-600'}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={overdue ? 'text-red-500 font-medium' : 'text-gray-500'}>
                        {due ?? '—'}
                        {overdue && <span className="ml-1 text-xs">已过期</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[160px] truncate text-gray-500" title={t.project ?? ''}>
                        {t.project || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleting(t)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        editing={editing}
        pending={saveMutation.isPending}
        error={saveMutation.isError ? errMsg(saveMutation.error) : null}
        onClose={closeForm}
        onSubmit={saveMutation.mutate}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除任务"
        description={`确定删除「${deleting?.title || '该任务'}」吗?此操作不可撤销。`}
        pending={deleteMutation.isPending}
        onCancel={cancelDelete}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function TaskFormDialog({
  open,
  editing,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: TaskItem | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TaskCreate) => void;
}) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [project, setProject] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setStatus(editing?.status ?? 'todo');
    setPriority(editing?.priority ?? 'medium');
    setDueDate(toDateKey(editing?.due_date) ?? '');
    setProject(editing?.project ?? '');
  }, [open, editing]);

  const handleSubmit = () => {
    onSubmit({
      title,
      status,
      priority,
      due_date: dueDate || null,
      project: project.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑任务' : '新建任务'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="标题">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="任务标题" />
          </Field>
          <Field label="状态">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLS}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="优先级">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={SELECT_CLS}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="截止日期">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="项目">
            <Input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="可选"
            />
          </Field>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 日程 ──

const GROUPS: { key: string; label: string; dot: string }[] = [
  { key: 'overdue', label: '过期', dot: 'bg-red-500' },
  { key: 'today', label: '今天', dot: 'bg-amber-500' },
  { key: 'week', label: '未来 7 天', dot: 'bg-blue-500' },
  { key: 'later', label: '更远', dot: 'bg-gray-400' },
  { key: 'none', label: '无日期', dot: 'bg-gray-300' },
];

function groupOf(task: TaskItem, today: string, weekEnd: string): string {
  const due = toDateKey(task.due_date);
  if (!due) return 'none';
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  if (due <= weekEnd) return 'week';
  return 'later';
}

function ScheduleTab() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks({ page_size: 500 }),
  });

  const toggleMutation = useMutation({
    mutationFn: (t: TaskItem) =>
      updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const items = data?.items ?? [];
  const today = todayKey();
  const weekEnd = addDays(today, 7);

  const overdueCount = items.filter((t) => {
    const d = toDateKey(t.due_date);
    return t.status !== 'done' && !!d && d < today;
  }).length;

  const grouped = useMemo(() => {
    const list = data?.items ?? [];
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const map: Record<string, TaskItem[]> = { overdue: [], today: [], week: [], later: [], none: [] };
    for (const t of list) map[groupOf(t, today, weekEnd)].push(t);
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aDue = toDateKey(a.due_date) ?? '9999-12-31';
        const bDue = toDateKey(b.due_date) ?? '9999-12-31';
        if (aDue !== bDue) return aDue < bDue ? -1 : 1;
        return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
      });
    }
    return map;
  }, [data, today, weekEnd]);

  const hasAny = items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-sm text-gray-600">
          今天:<span className="ml-1 font-medium">{formatToday()}</span>
        </div>
        <div className="text-sm">
          {overdueCount > 0 ? (
            <span className="text-red-500 font-medium">⚠️ {overdueCount} 项任务已过期</span>
          ) : (
            <span className="text-gray-400">没有过期任务 🎉</span>
          )}
        </div>
      </div>

      {toggleMutation.isError && (
        <p className="text-sm text-red-500">操作失败:{errMsg(toggleMutation.error)}</p>
      )}

      {isLoading ? (
        <StateHint>加载中…</StateHint>
      ) : isError ? (
        <StateHint>加载失败,请稍后重试</StateHint>
      ) : !hasAny ? (
        <StateHint>暂无任务,到「任务列表」新建</StateHint>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((g) => {
            const list = grouped[g.key] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`size-2 rounded-full ${g.dot}`} />
                  <span className="text-sm font-medium text-gray-700">{g.label}</span>
                  <span className="text-xs text-gray-400">{list.length}</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                  {list.map((t) => {
                    const done = t.status === 'done';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleMutation.mutate(t)}
                        disabled={toggleMutation.isPending}
                        title={done ? '标记为待办' : '标记为完成'}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <DoneIcon done={done} />
                        <span
                          className={`flex-1 truncate ${
                            done ? 'text-gray-400 line-through' : 'text-gray-800'
                          }`}
                        >
                          {t.title || '—'}
                        </span>
                        <Badge className={PRIORITY_BADGE[t.priority] ?? 'bg-gray-100 text-gray-600'}>
                          {PRIORITY_LABEL[t.priority] ?? t.priority}
                        </Badge>
                        {t.project && (
                          <span className="max-w-[160px] truncate text-xs text-gray-400" title={t.project}>
                            {t.project}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
