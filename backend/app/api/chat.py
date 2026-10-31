"""AI 对话(chat)API 路由。

本地 Ollama 与云模型(OpenAI 兼容)统一走 OpenAI 的 /chat/completions 协议:
- GET  /api/v1/chat/models —— 可用模型列表(Ollama 实时拉取,云模型写死)
- POST /api/v1/chat        —— 对话,支持 SSE 流式与非流式
"""

import json
from typing import AsyncIterator, List, Literal

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# Ollama 原生模型列表接口(非 OpenAI 兼容路径)
OLLAMA_TAGS_URL = "http://localhost:11434/api/tags"

# 云模型(OpenAI 兼容)写死在代码里,后续需要更多可直接在此追加
CLOUD_MODELS: List[dict] = [
    {"id": "deepseek-chat", "provider": "openai", "name": "DeepSeek 云"},
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str
    stream: bool = True


class ChatModelOut(BaseModel):
    id: str
    provider: str
    name: str


class ModelsResponse(BaseModel):
    models: List[ChatModelOut]


def _sse(obj: dict) -> str:
    """把一个 dict 编码成一行 SSE data 事件(带空行结尾)。"""
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _resolve_provider(model: str):
    """根据模型 id 判断走 ollama 还是云(openai 兼容)接口。"""
    if model in {m["id"] for m in CLOUD_MODELS}:
        return "openai", settings.openai_base_url.rstrip("/")
    return "ollama", settings.ollama_base_url.rstrip("/")


async def _fetch_ollama_models() -> List[str]:
    """实时拉取本地 Ollama 模型名;Ollama 未运行时静默返回空列表。"""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(OLLAMA_TAGS_URL)
            resp.raise_for_status()
            data = resp.json()
            return [m.get("name", "") for m in data.get("models", []) if m.get("name")]
    except Exception:  # noqa: BLE001 —— 连接失败/超时/格式异常都按「无本地模型」处理
        return []


@router.get("/models", response_model=ModelsResponse)
async def list_chat_models():
    """返回可用对话模型:本地 Ollama(实时)+ 云模型(写死)。"""
    models: List[ChatModelOut] = []

    ollama_names = await _fetch_ollama_models()
    # 默认主力模型置顶,方便前端默认选中
    if settings.default_chat_model in ollama_names:
        ollama_names.remove(settings.default_chat_model)
        ollama_names.insert(0, settings.default_chat_model)
    for name in ollama_names:
        models.append(ChatModelOut(id=name, provider="ollama", name=f"{name} 本地"))

    models.extend(CLOUD_MODELS)
    return ModelsResponse(models=models)


def _payload(body: ChatRequest, stream: bool) -> dict:
    return {
        "model": body.model,
        "messages": [m.model_dump() for m in body.messages],
        "stream": stream,
    }


def _headers(provider: str) -> dict:
    if provider != "openai":
        return {}
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="未配置 DEEPSEEK_API_KEY,无法使用云模型")
    return {"Authorization": f"Bearer {settings.openai_api_key}"}


async def _complete(body: ChatRequest, provider: str, base_url: str) -> str:
    """非流式:直接取助手回复文本。"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                json=_payload(body, stream=False),
                headers=_headers(provider),
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"模型接口错误: {e.response.status_code} {e.response.text[:200]}",
        ) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"无法连接模型服务: {e}") from e

    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


async def _stream_chat(body: ChatRequest, provider: str, base_url: str) -> AsyncIterator[str]:
    """流式:转发上游 OpenAI 协议 delta,重打包成 {content} 的 SSE 事件。"""
    try:
        headers = _headers(provider)
    except HTTPException:
        yield _sse({"error": "未配置 DEEPSEEK_API_KEY,无法使用云模型"})
        yield "data: [DONE]\n\n"
        return

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                json=_payload(body, stream=True),
                headers=headers,
            ) as resp:
                if resp.status_code >= 400:
                    err_text = (await resp.aread()).decode("utf-8", "replace")[:200]
                    yield _sse({"error": f"模型接口错误: {resp.status_code} {err_text}"})
                    yield "data: [DONE]\n\n"
                    return

                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                    if delta:
                        yield _sse({"content": delta})
    except httpx.RequestError as e:
        yield _sse({"error": f"无法连接模型服务: {e}"})

    yield "data: [DONE]\n\n"


@router.post("")
async def chat(body: ChatRequest):
    """对话接口。stream=true 时返回 SSE,否则一次性返回 JSON。"""
    provider, base_url = _resolve_provider(body.model)

    if body.stream:
        return StreamingResponse(
            _stream_chat(body, provider, base_url),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    content = await _complete(body, provider, base_url)
    return {"content": content, "model": body.model}
