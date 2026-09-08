"""News collection service: fetch from HN + RSS, score, dedupe, store."""

from __future__ import annotations

import calendar
import logging
import math
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional, Tuple

import feedparser
import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.article import Article
from app.news_sources import RSS_SOURCES, HN_AUTHORITY, KEYWORD_WEIGHTS, IMPORTANT_KEYWORDS
from app.services.crawl_service import _extract_content

logger = logging.getLogger("news_collector")

HN_API = "https://hn.algolia.com/api/v1/search_by_date"

# Cap the number of items kept per source so one high-volume feed can't flood the list
PER_SOURCE_LIMIT = 12


# ── Helpers ────────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    return (s or "").lower()


def _classify(title: str, fallback: str) -> str:
    """Classify an item into tech/finance/ai by keyword, else the feed's category."""
    t = _norm(title)
    for kw in KEYWORD_WEIGHTS["ai"]:
        if _norm(kw) in t:
            return "ai"
    for kw in KEYWORD_WEIGHTS["finance"]:
        if _norm(kw) in t:
            return "finance"
    if fallback in ("tech", "ai", "finance"):
        return fallback
    return "tech"


def _importance(title: str) -> float:
    """Keyword-based importance score 0..1."""
    t = _norm(title)
    score = 0.0
    for kw in IMPORTANT_KEYWORDS:
        if _norm(kw) in t:
            score += 0.25
    for kws in KEYWORD_WEIGHTS.values():
        for kw in kws:
            if _norm(kw) in t:
                score += 0.08
    return min(score, 1.0)


def _freshness(published_dt: Optional[datetime], now: datetime) -> float:
    """Exponential decay over hours: 1 at publish, ~0.37 at 48h."""
    if published_dt is None:
        return 0.5
    age_h = max(0.0, (now - published_dt).total_seconds() / 3600.0)
    return math.exp(-age_h / 48.0)


def _score(authority: float, readership: int, importance: float, freshness: float) -> float:
    """Composite ranking score 0..100."""
    readership_norm = min(readership / 300.0, 1.0)
    raw = 0.35 * authority + 0.35 * readership_norm + 0.30 * importance
    return round(raw * freshness * 100.0, 1)


def _parse_dt(value) -> Optional[datetime]:
    """Parse various datetime formats into an aware UTC datetime."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    # feedparser: time.struct_time (already UTC)
    if hasattr(value, "tm_year"):
        return datetime.fromtimestamp(calendar.timegm(value), tz=timezone.utc)
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        for fmt in (
            "%a, %d %b %Y %H:%M:%S %z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%d %H:%M:%S",
        ):
            try:
                dt = datetime.strptime(value, fmt)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def _clean_summary(html: str, max_len: int = 500) -> str:
    if not html:
        return ""
    text = BeautifulSoup(html, "lxml").get_text(" ", strip=True)
    return text[:max_len]


# ── Fetchers ───────────────────────────────────────────────────────────────

async def _fetch_hn(client: httpx.AsyncClient) -> List[dict]:
    """Fetch recent popular HN stories (last 24h); points + comments are the readership signal."""
    candidates: List[dict] = []
    try:
        since = int(time.time()) - 86400
        r = await client.get(
            HN_API,
            params={
                "tags": "story",
                "hitsPerPage": 100,
                "numericFilters": f"points>20,created_at_i>{since}",
            },
            headers={"User-Agent": settings.crawl_user_agent},
            follow_redirects=True,
        )
        r.raise_for_status()
        data = r.json()
        for hit in data.get("hits", []):
            title = hit.get("title") or hit.get("story_title")
            if not title:
                continue
            url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
            created = hit.get("created_at_i")
            candidates.append({
                "title": title.strip(),
                "url": url,
                "source": "Hacker News",
                "category": _classify(title, "tech"),
                "summary": "",
                "published_at": _parse_dt(created),
                "authority": HN_AUTHORITY,
                "readership": int(hit.get("points") or 0) + int(hit.get("num_comments") or 0),
            })
    except Exception as e:  # noqa: BLE001 — keep collecting even if one source fails
        logger.warning("HN fetch failed: %s (%s)", e, type(e).__name__)
    return candidates


async def _fetch_rss(client: httpx.AsyncClient, source: dict) -> List[dict]:
    """Fetch one RSS feed and extract candidate items."""
    candidates: List[dict] = []
    try:
        r = await client.get(
            source["url"], headers={"User-Agent": settings.crawl_user_agent}, follow_redirects=True
        )
        r.raise_for_status()
        parsed = feedparser.parse(r.content)
        for entry in parsed.entries[:50]:
            title = (entry.get("title") or "").strip()
            url = entry.get("link")
            if not title or not url:
                continue
            published = _parse_dt(entry.get("published_parsed") or entry.get("updated_parsed"))
            candidates.append({
                "title": title,
                "url": url,
                "source": source["name"],
                "category": source["category"],
                "summary": _clean_summary(entry.get("summary") or ""),
                "published_at": published,
                "authority": source["authority"],
                "readership": 0,
            })
    except Exception as e:  # noqa: BLE001
        logger.warning("RSS fetch failed for %s: %s (%s)", source["name"], e, type(e).__name__)
    return candidates


# ── Public API ─────────────────────────────────────────────────────────────

async def collect_news(db: AsyncSession) -> dict:
    """Fetch, score, dedupe, and store the top news items (bounded per run)."""
    now = datetime.now(timezone.utc)
    async with httpx.AsyncClient(timeout=settings.news_http_timeout) as client:
        hn = await _fetch_hn(client)
        rss: List[dict] = []
        for src in RSS_SOURCES:
            rss.extend(await _fetch_rss(client, src))

    all_candidates = hn + rss

    # Score + dedupe within this run
    seen_urls: set = set()
    scored: List[dict] = []
    for c in all_candidates:
        if c["url"] in seen_urls:
            continue
        seen_urls.add(c["url"])
        c["importance"] = _importance(c["title"])
        c["score"] = _score(c["authority"], c["readership"], c["importance"], _freshness(c["published_at"], now))
        scored.append(c)

    # Dedupe against already-stored articles
    urls = [c["url"] for c in scored]
    existing: set = set()
    if urls:
        q = select(Article.url).where(Article.url.in_(urls))
        existing = set((await db.execute(q)).scalars().all())

    fresh = [c for c in scored if c["url"] not in existing]

    # Cap per source so a single high-volume feed can't flood the list
    by_source: dict = defaultdict(list)
    for c in fresh:
        by_source[c["source"]].append(c)
    capped: List[dict] = []
    for items in by_source.values():
        items.sort(key=lambda c: c["score"], reverse=True)
        capped.extend(items[:PER_SOURCE_LIMIT])

    capped.sort(key=lambda c: c["score"], reverse=True)
    new_items = capped[: settings.max_articles_per_run]

    for c in new_items:
        db.add(Article(
            title=c["title"][:500],
            url=c["url"],
            source=c["source"],
            category=c["category"],
            summary=c["summary"],
            published_at=c["published_at"].isoformat() if c["published_at"] else "",
            score=c["score"],
            authority=c["authority"],
            readership=c["readership"],
            importance=c["importance"],
        ))
    await db.commit()

    return {
        "fetched": len(all_candidates),
        "scored": len(scored),
        "db_duplicates": len(scored) - len(fresh),
        "saved": len(new_items),
        "dropped_by_cap": len(fresh) - len(new_items),
    }


async def list_news(
    db: AsyncSession,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[Article], int]:
    """List articles sorted by score desc, optionally filtered by category."""
    base_q = select(Article)
    if category and category != "all":
        base_q = base_q.where(Article.category == category)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        base_q
        .order_by(Article.score.desc(), Article.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    return list(result.scalars().all()), total


async def get_article(db: AsyncSession, article_id: str) -> Optional[Article]:
    return await db.get(Article, article_id)


async def fetch_article_content(db: AsyncSession, article: Article) -> str:
    """Fetch full article text on demand and cache it (reuses crawl extraction)."""
    if article.content:
        return article.content

    async with httpx.AsyncClient(timeout=settings.crawl_timeout_seconds) as client:
        r = await client.get(
            article.url, headers={"User-Agent": settings.crawl_user_agent}, follow_redirects=True
        )
        r.raise_for_status()

    content_md = _extract_content(r.text, article.url)
    article.content = content_md
    await db.commit()
    return content_md
