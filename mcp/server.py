"""Mnemosyne Workbench MCP Server。

把 Mnemosyne(CPKB 个人知识库工作台)的能力以 MCP 工具的形式暴露给编排客户端
(如 Hermes)。Hermes 作为 MCP client 通过 stdio 连接本进程,即可在会话里调用
「搜笔记」「列任务」「追血缘」等工具。

设计要点:
- 独立进程:不 import backend 代码,通过 HTTP 调用 Mnemosyne 的 REST API(前缀 /api/v1)。
- API 地址由环境变量 `MNEMOSYNE_API_URL` 指定,默认 http://localhost:8000。
- 使用官方 `mcp` 库的 FastMCP 高层 API,stdio 传输。
- 注意:stdio 传输下 stdout 被 JSON-RPC 协议占用,本进程内禁止 print。

启动方式:
    python mcp/server.py
"""

from __future__ import annotations

import os

import httpx
from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
# Mnemosyne 后端地址,末尾的 / 去掉以便拼接路径。
API_BASE = os.environ.get("MNEMOSYNE_API_URL", "http://localhost:8000").rstrip("/")
# 请求超时(秒),可选覆盖。
API_TIMEOUT = float(os.environ.get("MNEMOSYNE_API_TIMEOUT", "30"))

mcp = FastMCP("workbench")

# 一个进程内共用一个客户端(httpx.Client 线程安全)。
_client = httpx.Client(base_url=API_BASE, timeout=API_TIMEOUT)


# ---------------------------------------------------------------------------
# HTTP 辅助函数
# ---------------------------------------------------------------------------
def _clean(params: dict) -> dict:
    """去掉值为 None 的参数,避免把 null 发给后端。"""
    return {k: v for k, v in params.items() if v is not None}


def _request(method: str, path: str, *, params: dict | None = None, json: dict | None = None) -> dict:
    """统一 HTTP 调用。

    成功(2xx)返回解析后的 JSON dict;失败抛 RuntimeError,并把 API 的 detail
    带进错误信息,方便编排客户端直接把原因展示给用户。
    """
    try:
        resp = _client.request(method, path, params=params, json=json)
    except httpx.HTTPError as exc:
        # 连接失败 / 超时等:给出可读错误。
        raise RuntimeError(f"无法连接 Mnemosyne API({API_BASE}): {exc}") from exc

    if resp.is_error:
        detail = ""
        try:
            detail = resp.json().get("detail", "")
        except Exception:  # noqa: BLE001 响应可能不是 JSON
            detail = resp.text[:200]
        raise RuntimeError(f"Mnemosyne API 返回 {resp.status_code}: {detail or resp.text[:200]}")

    if resp.status_code == 204:
        return {}
    return resp.json()


# ---------------------------------------------------------------------------
# 工具:笔记
# ---------------------------------------------------------------------------
@mcp.tool()
def search_notes(query: str, limit: int = 10) -> dict:
    """全文搜索笔记,返回标题与匹配片段(不返回全文)。

    Args:
        query: 搜索关键词,基于 SQLite FTS5 全文索引检索。
        limit: 最多返回的结果条数,默认 10。

    Returns:
        {"query": ..., "results": [{"id", "title", "snippet", "score"}], "total": ...}
    """
    return _request("GET", "/api/v1/search", params=_clean({"q": query, "limit": limit}))


@mcp.tool()
def list_notes(limit: int = 20) -> dict:
    """分页列出笔记(只含标题、置顶、标签与时间,不含正文)。

    Args:
        limit: 每页条数,默认 20。

    Returns:
        {"items": [{"id", "title", "is_pinned", "tags", "created_at", "updated_at"}],
         "total", "page", "page_size"}
    """
    return _request("GET", "/api/v1/notes", params={"page": 1, "page_size": limit})


@mcp.tool()
def get_note(note_id: str) -> dict:
    """按 id 取单篇笔记全文(含正文、标签、反链/出链)。

    Args:
        note_id: 笔记 id。

    Returns:
        笔记详情 dict,含 content / backlinks / outlinks 等字段。
    """
    return _request("GET", f"/api/v1/notes/{note_id}")


@mcp.tool()
def create_note(title: str, content: str) -> dict:
    """新建一篇笔记,正文会由后端存到 NAS 文件,元数据存 SQLite。

    Args:
        title: 笔记标题。
        content: 笔记正文(Markdown,支持 [[笔记标题]] 双向链接语法)。

    Returns:
        新建笔记的详情 dict。
    """
    return _request("POST", "/api/v1/notes", json={"title": title, "content": content})


# ---------------------------------------------------------------------------
# 工具:任务
# ---------------------------------------------------------------------------
@mcp.tool()
def list_tasks(status: str | None = None, limit: int = 20) -> dict:
    """分页列出任务,可按状态过滤。

    Args:
        status: 按状态过滤,可选 todo / doing / done;传 None 表示不过滤。
        limit: 每页条数,默认 20。

    Returns:
        {"items": [{"id", "title", "status", "priority", "due_date", "project",
        "created_at", "updated_at"}], "total", "page", "page_size"}
    """
    return _request(
        "GET", "/api/v1/tasks",
        params=_clean({"page": 1, "page_size": limit, "status": status}),
    )


@mcp.tool()
def create_task(
    title: str,
    priority: str = "medium",
    due_date: str | None = None,
    project: str | None = None,
) -> dict:
    """新建任务,状态默认为 todo。

    Args:
        title: 任务标题。
        priority: 优先级,可选 low / medium / high,默认 medium。
        due_date: 截止日期字符串(如 2026-11-02),可选。
        project: 所属项目名,可选。

    Returns:
        新建任务的 dict。
    """
    return _request(
        "POST", "/api/v1/tasks",
        json=_clean({
            "title": title,
            "priority": priority,
            "due_date": due_date,
            "project": project,
        }),
    )


@mcp.tool()
def update_task(
    task_id: str,
    status: str | None = None,
    title: str | None = None,
    priority: str | None = None,
    due_date: str | None = None,
    project: str | None = None,
) -> dict:
    """按 id 更新任务,只更新传入的字段。

    Args:
        task_id: 任务 id。
        status: 新状态,可选 todo / doing / done。
        title: 新标题,可选。
        priority: 新优先级,可选 low / medium / high。
        due_date: 新截止日期字符串,可选。
        project: 新项目名,可选。

    Returns:
        更新后的任务 dict。
    """
    body = _clean({
        "title": title,
        "status": status,
        "priority": priority,
        "due_date": due_date,
        "project": project,
    })
    return _request("PUT", f"/api/v1/tasks/{task_id}", json=body)


# ---------------------------------------------------------------------------
# 工具:素材 / 模型 / 提示词
# ---------------------------------------------------------------------------
@mcp.tool()
def list_assets(type: str | None = None, limit: int = 20) -> dict:
    """分页列出素材,可按类型过滤。

    Args:
        type: 素材类型,可选 image / video / text / prompt / model;传 None 表示不过滤。
        limit: 每页条数,默认 20。

    Returns:
        {"items": [{"id", "type", "title", "path", "eagle_id", "created_at"}],
         "total", "page", "page_size"}
    """
    return _request(
        "GET", "/api/v1/assets",
        params=_clean({"page": 1, "page_size": limit, "type": type}),
    )


@mcp.tool()
def create_asset(type: str, title: str, path: str) -> dict:
    """新建一条素材记录。

    Args:
        type: 素材类型,可选 image / video / text / prompt / model。
        title: 素材标题。
        path: 素材路径(文件或目录)。

    Returns:
        新建素材的 dict。
    """
    return _request("POST", "/api/v1/assets", json={"type": type, "title": title, "path": path})


@mcp.tool()
def list_prompts(limit: int = 20) -> dict:
    """分页列出提示词。

    Args:
        limit: 每页条数,默认 20。

    Returns:
        {"items": [{"id", "title", "text", "tags", "created_at"}],
         "total", "page", "page_size"}
    """
    return _request("GET", "/api/v1/prompts", params={"page": 1, "page_size": limit})


@mcp.tool()
def list_models(limit: int = 20) -> dict:
    """分页列出模型。

    Args:
        limit: 每页条数,默认 20。

    Returns:
        {"items": [{"id", "name", "kind", "path", "created_at"}],
         "total", "page", "page_size"}
    """
    return _request("GET", "/api/v1/models", params={"page": 1, "page_size": limit})


# ---------------------------------------------------------------------------
# 工具:血缘 / 资讯
# ---------------------------------------------------------------------------
@mcp.tool()
def trace_lineage(type: str, id: str) -> dict:
    """追溯某个实体的上游血缘链路(BFS 沿 source→target 方向展开)。

    Args:
        type: 实体类型,可选 asset / model / prompt / task / note / project。
        id: 实体 id(project 等自由文本类型时,id 即名称)。

    Returns:
        {"nodes": [{"key", "type", "id", "label"}],
         "edges": [{"source", "target", "relation"}]}
    """
    return _request("GET", "/api/v1/lineage/trace", params={"type": type, "id": id})


@mcp.tool()
def list_news(limit: int = 10) -> dict:
    """分页列出资讯文章。

    Args:
        limit: 每页条数,默认 10。

    Returns:
        {"items": [{"id", "title", "url", "source", "category", "summary",
        "published_at", "score", ...}], "total", "page", "page_size"}
    """
    return _request("GET", "/api/v1/news", params={"page": 1, "page_size": limit})


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # 默认即 stdio 传输,不需要额外参数。
    mcp.run()
