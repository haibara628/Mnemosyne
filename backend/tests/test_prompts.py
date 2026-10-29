"""提示词(prompts)CRUD API 测试。"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_prompt(client: AsyncClient):
    res = await client.post("/api/v1/prompts", json={
        "title": "写实人像", "text": "masterpiece, 1girl", "tags": "portrait,realistic",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "写实人像"
    assert data["tags"] == "portrait,realistic"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_prompts(client: AsyncClient):
    await client.post("/api/v1/prompts", json={"title": "p1"})
    await client.post("/api/v1/prompts", json={"title": "p2"})

    res = await client.get("/api/v1/prompts")
    assert res.status_code == 200
    assert res.json()["total"] == 2


@pytest.mark.asyncio
async def test_get_prompt(client: AsyncClient):
    created = await client.post("/api/v1/prompts", json={"title": "p", "text": "txt"})
    prompt_id = created.json()["id"]

    res = await client.get(f"/api/v1/prompts/{prompt_id}")
    assert res.status_code == 200
    assert res.json()["text"] == "txt"


@pytest.mark.asyncio
async def test_update_prompt(client: AsyncClient):
    created = await client.post("/api/v1/prompts", json={"title": "旧", "text": "a"})
    prompt_id = created.json()["id"]

    res = await client.put(f"/api/v1/prompts/{prompt_id}", json={"text": "b", "tags": "x,y"})
    assert res.status_code == 200
    data = res.json()
    assert data["text"] == "b"
    assert data["tags"] == "x,y"


@pytest.mark.asyncio
async def test_delete_prompt(client: AsyncClient):
    created = await client.post("/api/v1/prompts", json={"title": "删"})
    prompt_id = created.json()["id"]

    assert (await client.delete(f"/api/v1/prompts/{prompt_id}")).status_code == 204
    assert (await client.get(f"/api/v1/prompts/{prompt_id}")).status_code == 404


@pytest.mark.asyncio
async def test_prompt_not_found(client: AsyncClient):
    assert (await client.get("/api/v1/prompts/nonexistent")).status_code == 404
