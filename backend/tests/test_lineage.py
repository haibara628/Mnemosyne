"""血缘(lineage)CRUD + 上游追溯 API 测试。"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_lineage(client: AsyncClient):
    res = await client.post("/api/v1/lineage", json={
        "source_type": "asset", "source_id": "asset-1",
        "target_type": "model", "target_id": "model-1",
        "relation": "generated_by",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["source_type"] == "asset"
    assert data["relation"] == "generated_by"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_lineage_conflict(client: AsyncClient):
    body = {
        "source_type": "asset", "source_id": "a",
        "target_type": "prompt", "target_id": "p",
        "relation": "uses_prompt",
    }
    assert (await client.post("/api/v1/lineage", json=body)).status_code == 201
    assert (await client.post("/api/v1/lineage", json=body)).status_code == 409


@pytest.mark.asyncio
async def test_list_lineage_filter(client: AsyncClient):
    await client.post("/api/v1/lineage", json={
        "source_type": "asset", "source_id": "a",
        "target_type": "model", "target_id": "m", "relation": "generated_by",
    })
    await client.post("/api/v1/lineage", json={
        "source_type": "asset", "source_id": "a",
        "target_type": "prompt", "target_id": "p", "relation": "uses_prompt",
    })

    res = await client.get("/api/v1/lineage", params={"relation": "uses_prompt"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["target_type"] == "prompt"


@pytest.mark.asyncio
async def test_delete_lineage(client: AsyncClient):
    created = await client.post("/api/v1/lineage", json={
        "source_type": "asset", "source_id": "a",
        "target_type": "model", "target_id": "m", "relation": "generated_by",
    })
    edge_id = created.json()["id"]

    assert (await client.delete(f"/api/v1/lineage/{edge_id}")).status_code == 204
    assert (await client.get(f"/api/v1/lineage/{edge_id}")).status_code == 404


@pytest.mark.asyncio
async def test_trace_upstream(client: AsyncClient):
    """从素材追溯上游:模型 + 提示词 + 源素材(含二级链路)。"""
    # 实体
    asset = (await client.post("/api/v1/assets", json={"title": "成品图"})).json()
    src_asset = (await client.post("/api/v1/assets", json={"title": "线稿"})).json()
    model = (await client.post("/api/v1/models", json={"name": "sd-xl"})).json()
    prompt = (await client.post("/api/v1/prompts", json={"title": "写实"})).json()

    # 血缘:成品图 -> 模型 / 提示词 / 线稿;线稿 -> 模型(二级上游)
    edges = [
        {"source_type": "asset", "source_id": asset["id"],
         "target_type": "model", "target_id": model["id"], "relation": "generated_by"},
        {"source_type": "asset", "source_id": asset["id"],
         "target_type": "prompt", "target_id": prompt["id"], "relation": "uses_prompt"},
        {"source_type": "asset", "source_id": asset["id"],
         "target_type": "asset", "target_id": src_asset["id"], "relation": "derived_from"},
        {"source_type": "asset", "source_id": src_asset["id"],
         "target_type": "model", "target_id": model["id"], "relation": "generated_by"},
    ]
    for e in edges:
        assert (await client.post("/api/v1/lineage", json=e)).status_code == 201

    res = await client.get("/api/v1/lineage/trace", params={"type": "asset", "id": asset["id"]})
    assert res.status_code == 200
    data = res.json()

    node_keys = {n["key"] for n in data["nodes"]}
    assert f"asset:{asset['id']}" in node_keys
    assert f"model:{model['id']}" in node_keys
    assert f"prompt:{prompt['id']}" in node_keys
    assert f"asset:{src_asset['id']}" in node_keys

    # 应包含 4 条边(含二级链路 src_asset -> model)
    assert len(data["edges"]) == 4
    relations = {e["relation"] for e in data["edges"]}
    assert relations == {"generated_by", "uses_prompt", "derived_from"}
