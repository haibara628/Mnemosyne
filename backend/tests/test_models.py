"""模型(models)CRUD API 测试。"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_model(client: AsyncClient):
    res = await client.post("/api/v1/models", json={
        "name": "sd-xl", "kind": "checkpoint", "path": "/nas/models/sd-xl.safetensors",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "sd-xl"
    assert data["kind"] == "checkpoint"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_models_filter_by_kind(client: AsyncClient):
    await client.post("/api/v1/models", json={"name": "c1", "kind": "checkpoint"})
    await client.post("/api/v1/models", json={"name": "l1", "kind": "lora"})

    res = await client.get("/api/v1/models", params={"kind": "lora"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["kind"] == "lora"


@pytest.mark.asyncio
async def test_get_model(client: AsyncClient):
    created = await client.post("/api/v1/models", json={"name": "m1"})
    model_id = created.json()["id"]

    res = await client.get(f"/api/v1/models/{model_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "m1"


@pytest.mark.asyncio
async def test_update_model(client: AsyncClient):
    created = await client.post("/api/v1/models", json={"name": "旧", "kind": "lora"})
    model_id = created.json()["id"]

    res = await client.put(f"/api/v1/models/{model_id}", json={"name": "新"})
    assert res.status_code == 200
    assert res.json()["name"] == "新"


@pytest.mark.asyncio
async def test_delete_model(client: AsyncClient):
    created = await client.post("/api/v1/models", json={"name": "删"})
    model_id = created.json()["id"]

    assert (await client.delete(f"/api/v1/models/{model_id}")).status_code == 204
    assert (await client.get(f"/api/v1/models/{model_id}")).status_code == 404


@pytest.mark.asyncio
async def test_model_not_found(client: AsyncClient):
    assert (await client.get("/api/v1/models/nonexistent")).status_code == 404
