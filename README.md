# 🧠 CPKB — 个人知识库系统

一个自托管的个人知识库，具备双向链接、全文搜索和 AI 能力。

## 已实现功能 (Phase 1 ✅)

- **笔记 CRUD** — 创建、阅读、编辑、删除笔记，支持富文本编辑器（TipTap）
- **双向链接** — 使用 `[[笔记标题]]` 语法链接笔记，反向链接自动出现在目标笔记侧边栏
- **全文搜索** — 基于 SQLite FTS5，搜索结果高亮显示匹配片段
- **网页剪藏** — 粘贴 URL，系统自动抓取网页内容并转为笔记
- **标签管理** — 用标签组织和筛选笔记
- **知识图谱** — 可视化笔记间的链接关系（SVG 实现）
- **数据导出** — 将所有笔记导出为 Markdown ZIP 压缩包
- **文件附件** — 上传文件并关联到笔记

## 技术栈

| 层 | 技术 |
|-------|-----------|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS v4 + shadcn/ui + BlockSuite(编辑器) |
| 后端 | Python FastAPI + SQLAlchemy 2.0 (异步) |
| 数据库 | SQLite + FTS5 |
| 部署 | Docker Compose |

## P0 工作台扩展

- **多模块外壳**:侧边栏导航 知识库 / 素材库 / 血缘 / 日程 / AI 面板(素材库/血缘/日程/AI 为 P1 占位页)。
- **BlockSuite 编辑器**:替代 TipTap,知识库笔记以 Markdown 存储(与 FTS、`[[wiki-link]]` 兼容)。
- **新增数据表**:`assets`(素材)/ `models`(模型)/ `prompts`(提示词)/ `tasks`(任务)+ `lineage`(血缘)。
- **新增 API**:`/api/v1/assets`、`/models`、`/prompts`、`/tasks`、`/lineage`(含上游追溯 `/lineage/trace`)。
- BlockSuite 独立引库验证结论见 [docs/blocksuite-spike.md](docs/blocksuite-spike.md)。

## 快速开始

### 1. 克隆项目

```bash
git clone <仓库地址> cpkb
cd cpkb
```

### 2. Docker 一键启动

```bash
# 构建并启动
docker-compose up -d --build

# 访问 http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 3. 开发模式

> 后端依赖 pin 与 Python 3.14 不兼容,请用 uv 安装 Python 3.12 建 venv(Docker 用 python:3.12-slim,无此问题)。

```bash
# 后端（终端 1）
cd backend
uv venv --python 3.12 .venv
uv pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
.venv/bin/python -m uvicorn app.main:app --reload

# 前端（终端 2）
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 4. 运行测试

```bash
cd backend
pytest -v
```

## 项目结构

```
cpkb/
├── backend/                  # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py           # FastAPI 入口，挂载 API 和前端静态文件
│   │   ├── config.py         # 配置管理 (pydantic-settings)
│   │   ├── database.py       # 异步 SQLAlchemy + FTS5 全文搜索触发器
│   │   ├── models/           # ORM 模型 (Note, Link, Tag, Attachment, CrawlTask)
│   │   ├── schemas/          # Pydantic 请求/响应模型
│   │   ├── api/              # 路由处理器（笔记/搜索/标签/链接/附件/抓取/导出）
│   │   ├── services/         # 业务逻辑层
│   │   └── utils/            # 工具函数（Markdown 解析、文件处理）
│   └── tests/                # pytest 测试用例
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/       # React 组件
│   │   │   ├── editor/       # TipTap 富文本编辑器
│   │   │   ├── layout/       # 侧边栏、搜索栏、反向链接面板
│   │   │   ├── notes/        # 笔记卡片、笔记列表
│   │   │   └── common/       # 通用组件
│   │   ├── pages/            # 页面组件（首页/笔记页/搜索页/图谱页/设置页）
│   │   ├── hooks/            # React Query 自定义 Hook
│   │   └── lib/              # TypeScript 类型定义 + API 客户端
│   └── index.html
├── docker-compose.yml        # Docker 编排文件
└── README.md
```

## 分阶段路线图

| 阶段 | 内容 | 说明 |
|------|------|------|
| **Phase 1** ✅ | 笔记 CRUD、双向链接、全文搜索、网页剪藏、基础图谱、文件附件 | 已完成：可用的知识库核心 |
| **Phase 2** 🔜 | 高级图谱可视化 (Cytoscape.js)、块引用 (Synced Block)、版本快照、Chrome 剪藏插件 | 规划中：完整的传统知识库 |
| **Phase 3** 🔮 | RAG 智能问答 (Claude API)、自动标签与摘要、知识缺口洞察、AI 写作辅助、智能网页抓取 | 展望：AI 赋能的第二大脑 |

## 核心设计决策

- **SQLite + FTS5** 而非 PostgreSQL —— 零配置、单文件、个人使用完美方案，后期可平滑升级
- **FastAPI** 而非 Django —— 原生异步、自动生成 OpenAPI 文档、AI 服务集成更便捷
- **TipTap** 而非自研编辑器 —— 基于 ProseMirror 的成熟方案，可扩展自定义节点（如 `[[双向链接]]`）
- **Monorepo 结构** —— 后端 Serve 前端构建产物，一个 Docker 容器跑全部，部署极简
- **独立链接表存储** —— `links` 表通过 source/target 双索引，反向链接查询 O(1) 效率
