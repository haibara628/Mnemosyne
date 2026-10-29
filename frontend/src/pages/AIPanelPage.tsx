import { Sparkles } from 'lucide-react';
import ModulePlaceholder from '../components/common/ModulePlaceholder';

export default function AIPanelPage() {
  return (
    <ModulePlaceholder
      icon={Sparkles}
      title="AI 面板"
      description="对话模式(本地 Ollama + 云模型)与操作模式(Hermes 编排)入口。"
    />
  );
}
