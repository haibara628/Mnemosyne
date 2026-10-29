import { CalendarDays } from 'lucide-react';
import ModulePlaceholder from '../components/common/ModulePlaceholder';

export default function TasksPage() {
  return (
    <ModulePlaceholder
      icon={CalendarDays}
      title="日程"
      description="个人任务与待办:状态、优先级、截止日期与所属项目。"
    />
  );
}
