# Mnemosyne MCP Server

把 [Mnemosyne(CPKB 工作台)](..) 的能力暴露成 MCP 工具,供编排客户端(如 **Hermes**)通过 stdio 调用。Hermes 会话里说「搜我的笔记 X」,就会调本服务的 `search_notes` 工具,再经 HTTP 打到 Mnemosyne 的 REST API。

## 架构

```
Hermes (MCP client)  ──stdio(JSON-RPC)──>  mcp/server.py  ──HTTP──>  Mnemosyne FastAPI (/api/v1)
```

- MCP server 是**独立进程**,通过 HTTP 调 Mnemosyne 现有 API,**不 import backend 代码**,完全解耦。
- 传输方式为 **stdio**,由官方 [`mcp`](https://github.com/modelcontextprotocol/python-sdk) 库的 FastMCP 高层 API 实现。

## 安装

> 与后端一致,建议用 Python 3.12 建 venv(系统 Python 3.14 亦可,但后端依赖 pin 不兼容 3.14 的问题这里不受影响)。

```bash
cd mcp
uv venv --python 3.12 .venv
uv pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

或直接用系统 pip:

```bash
cd mcp
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 运行

先确保 Mnemosyne 后端在跑(默认 `http://localhost:8000`,见 [../README.md](../README.md) 的「开发模式」)。

```bash
cd mcp
.venv/bin/python server.py
```

- 服务以 stdio 模式启动,不监听端口,静默等待 client 发 JSON-RPC 消息。
- **不要在本进程里 `print`** —— stdio 下 stdout 被协议占用,任何打印都会破坏 JSON-RPC 帧。

### 配置

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `MNEMOSYNE_API_URL` | `http://localhost:8000` | Mnemosyne 后端地址(不带 `/api/v1`) |
| `MNEMOSYNE_API_TIMEOUT` | `30` | HTTP 请求超时(秒) |

指向远程/ECS 实例时:

```bash
MNEMOSYNE_API_URL=http://your-ecs:8000 .venv/bin/python server.py
```

## 让 Hermes 连接

stdio 模式,`hermes mcp add` 指定启动命令即可:

```bash
hermes mcp add workbench -- .venv/bin/python server.py
```

> 在 `mcp/` 目录下执行上述命令;若从仓库根目录执行,把脚本路径写全:
> `hermes mcp add workbench -- mcp/.venv/bin/python mcp/server.py`

如果 Hermes 的 MCP 配置支持环境变量,补上 `MNEMOSYNE_API_URL`:

```json
{
  "mcpServers": {
    "workbench": {
      "command": "mcp/.venv/bin/python",
      "args": ["mcp/server.py"],
      "env": { "MNEMOSYNE_API_URL": "http://your-ecs:8000" }
    }
  }
}
```

## 暴露的工具

| 工具 | 对应 API | 说明 |
|---|---|---|
| `search_notes(query, limit=10)` | `GET /api/v1/search` | 全文搜索笔记,返回标题 + 匹配片段 |
| `list_notes(limit=20)` | `GET /api/v1/notes` | 列笔记(标题/置顶/标签/时间) |
| `get_note(note_id)` | `GET /api/v1/notes/{id}` | 取笔记全文(含反链/出链) |
| `create_note(title, content)` | `POST /api/v1/notes` | 建笔记,正文存 NAS 文件 |
| `list_tasks(status=None, limit=20)` | `GET /api/v1/tasks` | 列任务,可按状态过滤 |
| `create_task(title, priority="medium", due_date=None, project=None)` | `POST /api/v1/tasks` | 建任务 |
| `update_task(task_id, status=None, ...)` | `PUT /api/v1/tasks/{id}` | 更新任务(只更新传入字段) |
| `list_assets(type=None, limit=20)` | `GET /api/v1/assets` | 列素材,可按类型过滤 |
| `create_asset(type, title, path)` | `POST /api/v1/assets` | 建素材记录 |
| `list_prompts(limit=20)` | `GET /api/v1/prompts` | 列提示词 |
| `list_models(limit=20)` | `GET /api/v1/models` | 列模型 |
| `trace_lineage(type, id)` | `GET /api/v1/lineage/trace` | 追上游血缘(BFS) |
| `list_news(limit=10)` | `GET /api/v1/news` | 列资讯 |

工具名统一 snake_case,描述写在函数 docstring 里(供 LLM 理解用途);返回值直接把 API 响应透传为 JSON,失败时抛带 `detail` 的错误。

## 验证

```bash
# 1) 启动不报错(stdio 静默等待即正常)
cd mcp && .venv/bin/python server.py

# 2) 端到端:另起终端,起后端并注册工具调用
# 后端(本地冒烟,覆盖 NAS 数据目录):
MNEMOSYNE_DATA_DIR=/tmp/mnemosyne_smoke/data \
MNEMOSYNE_NOTES_DIR=/tmp/mnemosyne_smoke/notes \
MNEMOSYNE_UPLOAD_DIR=/tmp/mnemosyne_smoke/uploads \
  ../backend/.venv/bin/uvicorn app.main:app --app-dir ../backend --port 8000

# 再让 MCP client 调 tools/list + tools/call(见仓库内的验证脚本或 MCP Inspector)。
```
