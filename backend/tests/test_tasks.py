"""任务(tasks)CRUD API 测试。"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    res = await client.post("/api/v1/tasks", json={
        "title": "写周报", "status": "todo", "priority": "high",
        "due_date": "2026-10-30", "project": "工作台",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "写周报"
    assert data["priority"] == "high"
    assert data["project"] == "工作台"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_tasks_filter(client: AsyncClient):
    await client.post("/api/v1/tasks", json={"title": "a", "status": "todo"})
    await client.post("/api/v1/tasks", json={"title": "b", "status": "done"})

    res = await client.get("/api/v1/tasks", params={"status": "done"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "done"


@pytest.mark.asyncio
async def test_get_task(client: AsyncClient):
    created = await client.post("/api/v1/tasks", json={"title": "t"})
    task_id = created.json()["id"]

    res = await client.get(f"/api/v1/tasks/{task_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "t"


@pytest.mark.asyncio
async def test_update_task(client: AsyncClient):
    created = await client.post("/api/v1/tasks", json={"title": "旧", "status": "todo"})
    task_id = created.json()["id"]

    res = await client.put(f"/api/v1/tasks/{task_id}", json={"status": "done"})
    assert res.status_code == 200
    assert res.json()["status"] == "done"


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    created = await client.post("/api/v1/tasks", json={"title": "删"})
    task_id = created.json()["id"]

    assert (await client.delete(f"/api/v1/tasks/{task_id}")).status_code == 204
    assert (await client.get(f"/api/v1/tasks/{task_id}")).status_code == 404


@pytest.mark.asyncio
async def test_task_not_found(client: AsyncClient):
    assert (await client.get("/api/v1/tasks/nonexistent")).status_code == 404
