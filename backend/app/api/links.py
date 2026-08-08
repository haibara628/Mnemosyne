"""Links and graph API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.link import Link
from app.models.note import Note
from app.schemas.link import GraphData, GraphNode, GraphEdge

router = APIRouter(prefix="/api/v1/links", tags=["links"])


@router.get("/graph", response_model=GraphData)
async def get_graph(db: AsyncSession = Depends(get_db)):
    """Get full knowledge graph data (nodes + edges)."""
    # Get all links
    result = await db.execute(select(Link))
    links = result.scalars().all()

    # Collect unique note IDs
    note_ids = set()
    for link in links:
        note_ids.add(link.source_note_id)
        note_ids.add(link.target_note_id)

    # Fetch note titles
    nodes = []
    if note_ids:
        result = await db.execute(
            select(Note.id, Note.title).where(Note.id.in_(note_ids))
        )
        title_map = {row.id: row.title for row in result.all()}

        for note_id in note_ids:
            nodes.append(GraphNode(
                id=note_id,
                label=title_map.get(note_id, note_id[:8]),
            ))

    edges = [
        GraphEdge(source=link.source_note_id, target=link.target_note_id, context=link.context)
        for link in links
    ]

    return GraphData(nodes=nodes, edges=edges)
