import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ModulePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** P0 阶段的空壳模块页面占位(接后端 API 是 P1)。 */
export default function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Icon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">{title}</h1>
        <Badge variant="secondary">P1</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            该模块为占位页面,后端表与 CRUD API 已就绪,前端接入在 P1 完成。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
