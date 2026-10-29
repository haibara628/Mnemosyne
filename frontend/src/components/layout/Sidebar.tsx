import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Images,
  GitBranch,
  CalendarDays,
  Sparkles,
  Newspaper,
  Share2,
  Search,
  Settings,
  Plus,
  Link2,
  type LucideIcon,
} from 'lucide-react';
import { fetchTags, submitCrawl } from '../../lib/api';
import { useCreateNote } from '../../hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

function NavItem({ to, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const createNote = useCreateNote();
  const [crawlUrl, setCrawlUrl] = useState('');
  const [showCrawl, setShowCrawl] = useState(false);

  const handleNewNote = async () => {
    const note = await createNote.mutateAsync({
      title: 'Untitled',
      content: '',
      tag_ids: [],
    });
    navigate(`/notes/${note.id}`);
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    await submitCrawl(crawlUrl.trim());
    setCrawlUrl('');
    setShowCrawl(false);
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <aside className="w-60 h-screen border-r bg-background flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          🧠 CPKB
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">个人工作台 · Workbench</p>
      </div>

      {/* 快捷操作 */}
      <div className="p-3 space-y-2">
        <Button className="w-full" size="sm" onClick={handleNewNote}>
          <Plus className="size-4" /> 新建笔记
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => setShowCrawl(!showCrawl)}
        >
          <Link2 className="size-4" /> 剪藏网页
        </Button>
        {showCrawl && (
          <div className="flex gap-1.5">
            <Input
              type="url"
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              placeholder="https://..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
            />
            <Button size="sm" onClick={handleCrawl}>Go</Button>
          </div>
        )}
      </div>

      {/* 主模块导航 */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
          主模块
        </div>
        <NavItem to="/notes" icon={BookOpen} label="知识库" active={isActive('/notes')} />
        <NavItem to="/assets" icon={Images} label="素材库" active={isActive('/assets')} />
        <NavItem to="/lineage" icon={GitBranch} label="血缘" active={isActive('/lineage')} />
        <NavItem to="/tasks" icon={CalendarDays} label="日程" active={isActive('/tasks')} />
        <NavItem to="/ai" icon={Sparkles} label="AI 面板" active={isActive('/ai')} />

        <div className="px-3 py-1 mt-4 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
          更多
        </div>
        <NavItem to="/news" icon={Newspaper} label="资讯" active={isActive('/news')} />
        <NavItem to="/graph" icon={Share2} label="图谱" active={isActive('/graph')} />
        <NavItem to="/search" icon={Search} label="搜索" active={isActive('/search')} />

        {/* 标签 */}
        {tags && tags.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              标签
            </div>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/notes?tag_id=${tag.id}`}
                className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
              >
                <span># {tag.name}</span>
                <span className="text-xs text-muted-foreground/50">{tag.note_count}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* 底部 */}
      <div className="p-3 border-t">
        <NavItem to="/settings" icon={Settings} label="设置" active={isActive('/settings')} />
      </div>
    </aside>
  );
}
