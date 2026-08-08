"""Tests for notes CRUD API."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_note(client: AsyncClient):
    res = await client.post("/api/v1/notes", json={
        "title": "Test Note",
        "content": "<p>Hello world</p>",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Test Note"
    assert data["content"] == "<p>Hello world</p>"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_notes(client: AsyncClient):
    # Create a note first
    await client.post("/api/v1/notes", json={"title": "Note 1", "content": "A"})
    await client.post("/api/v1/notes", json={"title": "Note 2", "content": "B"})

    res = await client.get("/api/v1/notes")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_note(client: AsyncClient):
    create_res = await client.post("/api/v1/notes", json={"title": "My Note", "content": "Content"})
    note_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/notes/{note_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "My Note"


@pytest.mark.asyncio
async def test_update_note(client: AsyncClient):
    create_res = await client.post("/api/v1/notes", json={"title": "Old Title", "content": "Old"})
    note_id = create_res.json()["id"]

    res = await client.put(f"/api/v1/notes/{note_id}", json={
        "title": "New Title",
        "content": "<p>New Content</p>",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "New Title"
    assert data["content"] == "<p>New Content</p>"


@pytest.mark.asyncio
async def test_delete_note(client: AsyncClient):
    create_res = await client.post("/api/v1/notes", json={"title": "To Delete", "content": "..."})
    note_id = create_res.json()["id"]

    res = await client.delete(f"/api/v1/notes/{note_id}")
    assert res.status_code == 204

    # Verify deleted
    get_res = await client.get(f"/api/v1/notes/{note_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_note_not_found(client: AsyncClient):
    res = await client.get("/api/v1/notes/nonexistent")
    assert res.status_code == 404
