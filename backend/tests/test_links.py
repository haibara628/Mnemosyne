"""Tests for bidirectional link resolution."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bidirectional_links(client: AsyncClient):
    # Create Note B FIRST (so link target exists before source creates the link)
    n2 = await client.post("/api/v1/notes", json={
        "title": "Note B",
        "content": "<p>I am Note B</p>",
    })
    # Then create Note A referencing B
    n1 = await client.post("/api/v1/notes", json={
        "title": "Note A",
        "content": "<p>This references [[Note B]] in its content.</p>",
    })
    id_a = n1.json()["id"]
    id_b = n2.json()["id"]

    # Note A should have an outlink to Note B
    outlinks = await client.get(f"/api/v1/notes/{id_a}/outlinks")
    assert outlinks.status_code == 200
    assert len(outlinks.json()) == 1
    assert outlinks.json()[0]["note_title"] == "Note B"

    # Note B should have a backlink from Note A
    backlinks = await client.get(f"/api/v1/notes/{id_b}/backlinks")
    assert backlinks.status_code == 200
    assert len(backlinks.json()) == 1
    assert backlinks.json()[0]["note_title"] == "Note A"


@pytest.mark.asyncio
async def test_link_resolution_on_update(client: AsyncClient):
    # Create notes
    n1 = await client.post("/api/v1/notes", json={"title": "Source", "content": "No links"})
    n2 = await client.post("/api/v1/notes", json={"title": "Target", "content": "Target content"})

    # Initially no links
    outlinks = await client.get(f"/api/v1/notes/{n1.json()['id']}/outlinks")
    assert len(outlinks.json()) == 0

    # Update to add a link
    await client.put(f"/api/v1/notes/{n1.json()['id']}", json={
        "content": "<p>Now links to [[Target]]</p>",
    })

    # Should have link now
    outlinks = await client.get(f"/api/v1/notes/{n1.json()['id']}/outlinks")
    assert len(outlinks.json()) == 1
    assert outlinks.json()[0]["note_title"] == "Target"


@pytest.mark.asyncio
async def test_self_link_ignored(client: AsyncClient):
    res = await client.post("/api/v1/notes", json={
        "title": "Self Note",
        "content": "<p>I link to [[Self Note]] myself.</p>",
    })
    note_id = res.json()["id"]

    # Should not create a self-link
    outlinks = await client.get(f"/api/v1/notes/{note_id}/outlinks")
    assert len(outlinks.json()) == 0
