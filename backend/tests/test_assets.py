"""素材(assets)CRUD API 测试。"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_asset(client: AsyncClient):
    res = await client.post("/api/v1/assets", json={
        "type": "image", "title": "角色立绘", "path": "/nas/img/a.png",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "image"
    assert data["title"] == "角色立绘"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_assets_filter_by_type(client: AsyncClient):
    await client.post("/api/v1/assets", json={"type": "image", "title": "a"})
    await client.post("/api/v1/assets", json={"type": "video", "title": "b"})

    res = await client.get("/api/v1/assets", params={"type": "image"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["type"] == "image"


@pytest.mark.asyncio
async def test_get_asset(client: AsyncClient):
    created = await client.post("/api/v1/assets", json={"title": "素材", "path": "/p"})
    asset_id = created.json()["id"]

    res = await client.get(f"/api/v1/assets/{asset_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "素材"


@pytest.mark.asyncio
async def test_update_asset(client: AsyncClient):
    created = await client.post("/api/v1/assets", json={"title": "旧"})
    asset_id = created.json()["id"]

    res = await client.put(f"/api/v1/assets/{asset_id}", json={"title": "新", "eagle_id": "EAGLE1"})
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "新"
    assert data["eagle_id"] == "EAGLE1"


@pytest.mark.asyncio
async def test_delete_asset(client: AsyncClient):
    created = await client.post("/api/v1/assets", json={"title": "删"})
    asset_id = created.json()["id"]

    res = await client.delete(f"/api/v1/assets/{asset_id}")
    assert res.status_code == 204

    get_res = await client.get(f"/api/v1/assets/{asset_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_asset_not_found(client: AsyncClient):
    res = await client.get("/api/v1/assets/nonexistent")
    assert res.status_code == 404
