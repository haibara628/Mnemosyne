"""Markdown utilities: parse [[wiki-links]], extract plain text, etc."""

from __future__ import annotations

import re
from html.parser import HTMLParser


# Matches [[Note Title]] or [[Note Title|alias]]
WIKI_LINK_PATTERN = re.compile(r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]")


def extract_wiki_links(content: str) -> list[tuple[str, str | None]]:
    """Extract all [[wiki-links]] from content.

    Returns list of (title, alias_or_None) tuples. Titles are stripped.
    """
    matches = WIKI_LINK_PATTERN.findall(content)
    return [(title.strip(), alias.strip() if alias else None) for title, alias in matches]


def extract_unique_link_titles(content: str) -> list[str]:
    """Extract unique linked note titles from content."""
    links = extract_wiki_links(content)
    seen = set()
    unique = []
    for title, _ in links:
        if title not in seen:
            seen.add(title)
            unique.append(title)
    return unique


def strip_markdown(text: str) -> str:
    """Strip markdown formatting to get plain text for FTS indexing.

    Simple regex-based approach that handles common markdown syntax.
    """
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", " ", text)
    # Remove inline code
    text = re.sub(r"`[^`]+`", " ", text)
    # Remove images
    text = re.sub(r"!\[.*?\]\(.*?\)", " ", text)
    # Remove links but keep text
    text = re.sub(r"\[([^\]]*?)\]\(.*?\)", r"\1", text)
    # Remove wiki links but keep title
    text = re.sub(r"\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]", r"\1", text)
    # Remove headers markers
    text = re.sub(r"^#{1,6}\s+", " ", text, flags=re.MULTILINE)
    # Remove bold/italic
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    # Remove horizontal rules
    text = re.sub(r"^[-*_]{3,}\s*$", " ", text, flags=re.MULTILINE)
    # Remove blockquotes marker
    text = re.sub(r"^>\s+", " ", text, flags=re.MULTILINE)
    # Remove list markers
    text = re.sub(r"^\s*[-*+]\s+", " ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", " ", text, flags=re.MULTILINE)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()
