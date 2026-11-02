import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAsset,
  deleteAsset,
  fetchAssets,
  updateAsset,
  createModel,
  deleteModel,
  fetchModels,
  updateModel,
  createPrompt,
  deletePrompt,
  fetchPrompts,
  updatePrompt,
} from '../lib/api';
import type {
  AssetCreate,
  AssetItem,
  ModelCreate,
  ModelItem,
  PromptCreate,
  PromptItem,
} from '../lib/types';
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

const ASSET_TYPES = ['image', 'video', 'text', 'prompt', 'model'] as const;

const ASSET_TYPE_LABEL: Record<string, string> = {
  image: '图片',
  video: '视频',
  text: '文本',
  prompt: '提示词',
  model: '模型',
};

const ASSET_TYPE_BADGE: Record<string, string> = {
  image: 'bg-blue-50 text-blue-600',
  video: 'bg-purple-50 text-purple-600',
  text: 'bg-gray-100 text-gray-600',
  prompt: 'bg-amber-50 text-amber-600',
  model: 'bg-emerald-50 text-emerald-600',
};

const MODEL_KIND_BADGE: Record<string, string> = {
  checkpoint: 'bg-emerald-50 text-emerald-600',
  lora: 'bg-blue-50 text-blue-600',
  vae: 'bg-purple-50 text-purple-600',
  embedding: 'bg-amber-50 text-amber-600',
};

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

function splitTags(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
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

export default function AssetsPage() {
  const [tab, setTab] = useState('assets');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">🗂️ 素材管理</h1>
      <p className="text-sm text-gray-400 mb-5">管理创作素材、生成模型与提示词</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assets">素材</TabsTrigger>
          <TabsTrigger value="models">模型</TabsTrigger>
          <TabsTrigger value="prompts">提示词</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <AssetTab />
        </TabsContent>
        <TabsContent value="models">
          <ModelTab />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 素材 ──

function AssetTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetItem | null>(null);
  const [deleting, setDeleting] = useState<AssetItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['assets', typeFilter],
    queryFn: () =>
      fetchAssets({ type: typeFilter === 'all' ? undefined : typeFilter, page_size: 100 }),
  });

  const saveMutation = useMutation({
    mutationFn: (values: AssetCreate) =>
      editing ? updateAsset(editing.id, values) : createAsset(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      setDeleting(null);
    },
  });

  const items = data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: AssetItem) => {
    setEditing(a);
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
        <div className="flex gap-2 flex-wrap">
          {['all', ...ASSET_TYPES].map((t) => (
            <FilterPill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? '全部' : ASSET_TYPE_LABEL[t]}
            </FilterPill>
          ))}
        </div>
        <Button onClick={openCreate}>新建素材</Button>
      </div>

      {deleteMutation.isError && (
        <p className="text-sm text-red-500">删除失败:{errMsg(deleteMutation.error)}</p>
      )}

      {isLoading ? (
        <StateHint>加载中…</StateHint>
      ) : isError ? (
        <StateHint>加载失败,请稍后重试</StateHint>
      ) : items.length === 0 ? (
        <StateHint>暂无素材,点击「新建素材」添加</StateHint>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>路径</TableHead>
                <TableHead>Eagle ID</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge className={ASSET_TYPE_BADGE[a.type] ?? 'bg-gray-100 text-gray-600'}>
                      {ASSET_TYPE_LABEL[a.type] ?? a.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate font-medium text-gray-800" title={a.title}>
                      {a.title || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[260px] truncate text-gray-500" title={a.path}>
                      {a.path || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[160px] truncate text-gray-500" title={a.eagle_id ?? ''}>
                      {a.eagle_id || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">{formatDate(a.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleting(a)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssetFormDialog
        open={formOpen}
        editing={editing}
        pending={saveMutation.isPending}
        error={saveMutation.isError ? errMsg(saveMutation.error) : null}
        onClose={closeForm}
        onSubmit={saveMutation.mutate}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除素材"
        description={`确定删除「${deleting?.title || '该素材'}」吗?此操作不可撤销。`}
        pending={deleteMutation.isPending}
        onCancel={cancelDelete}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function AssetFormDialog({
  open,
  editing,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: AssetItem | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: AssetCreate) => void;
}) {
  const [type, setType] = useState('image');
  const [title, setTitle] = useState('');
  const [path, setPath] = useState('');
  const [eagleId, setEagleId] = useState('');

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? 'image');
    setTitle(editing?.title ?? '');
    setPath(editing?.path ?? '');
    setEagleId(editing?.eagle_id ?? '');
  }, [open, editing]);

  const handleSubmit = () => {
    onSubmit({ type, title, path, eagle_id: eagleId.trim() || null });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑素材' : '新建素材'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="类型">
            <select value={type} onChange={(e) => setType(e.target.value)} className={SELECT_CLS}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ASSET_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="标题">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="素材标题"
            />
          </Field>
          <Field label="路径">
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="文件路径或 eagle:// 链接"
            />
          </Field>
          <Field label="Eagle ID">
            <Input
              value={eagleId}
              onChange={(e) => setEagleId(e.target.value)}
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

// ── 模型 ──

function ModelTab() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModelItem | null>(null);
  const [deleting, setDeleting] = useState<ModelItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['models'],
    queryFn: () => fetchModels({ page_size: 100 }),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ModelCreate) =>
      editing ? updateModel(editing.id, values) : createModel(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['models'] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['models'] });
      setDeleting(null);
    },
  });

  const items = data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: ModelItem) => {
    setEditing(m);
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
        <span className="text-sm text-gray-400">共 {data?.total ?? 0} 个模型</span>
        <Button onClick={openCreate}>新建模型</Button>
      </div>

      {deleteMutation.isError && (
        <p className="text-sm text-red-500">删除失败:{errMsg(deleteMutation.error)}</p>
      )}

      {isLoading ? (
        <StateHint>加载中…</StateHint>
      ) : isError ? (
        <StateHint>加载失败,请稍后重试</StateHint>
      ) : items.length === 0 ? (
        <StateHint>暂无模型,点击「新建模型」添加</StateHint>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>路径</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="max-w-[240px] truncate font-medium text-gray-800" title={m.name}>
                      {m.name || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={MODEL_KIND_BADGE[m.kind] ?? 'bg-gray-100 text-gray-600'}>
                      {m.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] truncate text-gray-500" title={m.path}>
                      {m.path || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">{formatDate(m.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleting(m)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ModelFormDialog
        open={formOpen}
        editing={editing}
        pending={saveMutation.isPending}
        error={saveMutation.isError ? errMsg(saveMutation.error) : null}
        onClose={closeForm}
        onSubmit={saveMutation.mutate}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除模型"
        description={`确定删除「${deleting?.name || '该模型'}」吗?此操作不可撤销。`}
        pending={deleteMutation.isPending}
        onCancel={cancelDelete}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function ModelFormDialog({
  open,
  editing,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: ModelItem | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ModelCreate) => void;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('checkpoint');
  const [path, setPath] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setKind(editing?.kind ?? 'checkpoint');
    setPath(editing?.path ?? '');
  }, [open, editing]);

  const handleSubmit = () => {
    onSubmit({ name, kind, path });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑模型' : '新建模型'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="名称">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="模型名称" />
          </Field>
          <Field label="类型">
            <Input
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder="checkpoint / lora / vae / embedding"
            />
          </Field>
          <Field label="路径">
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="模型文件路径" />
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

// ── 提示词 ──

function PromptTab() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromptItem | null>(null);
  const [deleting, setDeleting] = useState<PromptItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => fetchPrompts({ page_size: 100 }),
  });

  const saveMutation = useMutation({
    mutationFn: (values: PromptCreate) =>
      editing ? updatePrompt(editing.id, values) : createPrompt(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePrompt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      setDeleting(null);
    },
  });

  const items = data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: PromptItem) => {
    setEditing(p);
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
        <span className="text-sm text-gray-400">共 {data?.total ?? 0} 条提示词</span>
        <Button onClick={openCreate}>新建提示词</Button>
      </div>

      {deleteMutation.isError && (
        <p className="text-sm text-red-500">删除失败:{errMsg(deleteMutation.error)}</p>
      )}

      {isLoading ? (
        <StateHint>加载中…</StateHint>
      ) : isError ? (
        <StateHint>加载失败,请稍后重试</StateHint>
      ) : items.length === 0 ? (
        <StateHint>暂无提示词,点击「新建提示词」添加</StateHint>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <button
                      onClick={() => openEdit(p)}
                      className="max-w-[240px] truncate text-left font-medium text-gray-800 hover:text-emerald-600"
                      title={p.title || '查看全文'}
                    >
                      {p.title || '—'}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap gap-1 max-w-[360px]">
                      {splitTags(p.tags).length > 0 ? (
                        splitTags(p.tags).map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">{formatDate(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleting(p)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PromptFormDialog
        open={formOpen}
        editing={editing}
        pending={saveMutation.isPending}
        error={saveMutation.isError ? errMsg(saveMutation.error) : null}
        onClose={closeForm}
        onSubmit={saveMutation.mutate}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除提示词"
        description={`确定删除「${deleting?.title || '该提示词'}」吗?此操作不可撤销。`}
        pending={deleteMutation.isPending}
        onCancel={cancelDelete}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function PromptFormDialog({
  open,
  editing,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: PromptItem | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: PromptCreate) => void;
}) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setTags(editing?.tags ?? '');
    setText(editing?.text ?? '');
  }, [open, editing]);

  const handleSubmit = () => {
    onSubmit({ title, tags, text });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑提示词' : '新建提示词'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="标题">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="提示词标题" />
          </Field>
          <Field label="标签">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="逗号分隔,如 portrait,realistic"
            />
          </Field>
          <Field label="正文">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="提示词全文"
              className="min-h-[180px]"
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
