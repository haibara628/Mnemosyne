"""Web crawl service: fetch pages, extract content, create notes."""

import asyncio
from datetime import datetime

import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.crawl_task import CrawlTask
from app.services.note_service import create_note


async def submit_crawl(db: AsyncSession, url: str) -> CrawlTask:
    """Create a crawl task and start it in the background."""
    task = CrawlTask(url=url, status="pending")
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Start background crawl (fire-and-forget)
    asyncio.create_task(_do_crawl(task.id, url))

    return task


async def _do_crawl(task_id: str, url: str):
    """Background task: fetch URL, extract content, create note."""
    from app.database import async_session

    async with async_session() as db:
        try:
            task = await db.get(CrawlTask, task_id)
            if task is None:
                return

            task.status = "fetching"
            await db.commit()

            # Fetch the page
            async with httpx.AsyncClient(timeout=settings.crawl_timeout_seconds) as client:
                response = await client.get(
                    url,
                    headers={"User-Agent": settings.crawl_user_agent},
                    follow_redirects=True,
                )
                response.raise_for_status()

            html = response.text
            soup = BeautifulSoup(html, "lxml")

            # Extract title
            title = _extract_title(soup, url)

            # Extract main content and convert to markdown
            content_md = _extract_content(html, url)

            # Create a note from the crawled content
            note = await create_note(
                db,
                title=title,
                content=content_md,
            )

            task.status = "done"
            task.title = title
            task.note_id = note.id
            task.finished_at = datetime.utcnow().isoformat()
            await db.commit()

        except Exception as e:
            task = await db.get(CrawlTask, task_id)
            if task:
                task.status = "failed"
                task.error_msg = str(e)
                task.finished_at = datetime.utcnow().isoformat()
                await db.commit()


def _extract_title(soup: BeautifulSoup, url: str) -> str:
    """Extract the best title from a page."""
    # Try og:title
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        return og_title["content"].strip()

    # Try <title>
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        return title_tag.string.strip()

    # Fall back to URL
    return url


def _extract_content(html: str, url: str) -> str:
    """Extract the main content as Markdown using readability + markdownify."""
    try:
        from readability import Document

        doc = Document(html)
        # Get the main article HTML
        article_html = doc.summary()

        # Add source URL header
        source_info = f"> 来源: [{url}]({url})\n\n"

        # Convert to Markdown
        markdown_content = md(
            article_html,
            heading_style="ATX",
            bullets="-",
            strip=["img", "script", "style", "iframe", "noscript"],
        )

        return source_info + (markdown_content or "*(无法提取正文内容)*")
    except Exception:
        # Fallback: basic BeautifulSoup extraction
        soup = BeautifulSoup(html, "lxml")
        # Remove non-content elements
        for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()

        body = soup.find("body")
        text = md(str(body) if body else html, heading_style="ATX")
        return f"> 来源: [{url}]({url})\n\n{text or '*(无法提取正文内容)*'}"
