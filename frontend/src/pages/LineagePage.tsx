import { GitBranch } from 'lucide-react';
import ModulePlaceholder from '../components/common/ModulePlaceholder';

export default function LineagePage() {
  return (
    <ModulePlaceholder
      icon={GitBranch}
      title="血缘"
      description="素材与模型 / 提示词 / 源素材 / 项目之间的生成链路关系。"
    />
  );
}
