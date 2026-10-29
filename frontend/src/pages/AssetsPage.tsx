import { Images } from 'lucide-react';
import ModulePlaceholder from '../components/common/ModulePlaceholder';

export default function AssetsPage() {
  return (
    <ModulePlaceholder
      icon={Images}
      title="素材库"
      description="图片 / 视频 / 文本 / 提示词 / 模型等创作素材。"
    />
  );
}
