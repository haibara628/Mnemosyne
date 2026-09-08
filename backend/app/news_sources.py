"""News sources configuration + keyword importance tables.

Each RSS source carries a static `authority` weight (0..1) used when no
readership signal is available (RSS feeds don't expose engagement metrics).
Hacker News provides real points/comments, used as the readership signal.
"""

# RSS feeds: name, url, category, authority
RSS_SOURCES = [
    # ── Finance ──
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "category": "finance", "authority": 0.90},
    {"name": "Financial Times", "url": "https://www.ft.com/rss/home", "category": "finance", "authority": 0.85},
    {"name": "WSJ Markets", "url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", "category": "finance", "authority": 0.80},
    {"name": "The Economist", "url": "https://www.economist.com/finance-and-economics/rss.xml", "category": "finance", "authority": 0.85},
    {"name": "CNBC Top News", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "category": "finance", "authority": 0.70},
    {"name": "MarketWatch", "url": "http://feeds.marketwatch.com/marketwatch/topstories/", "category": "finance", "authority": 0.60},
    # ── Tech ──
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "category": "tech", "authority": 0.70},
    {"name": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "category": "tech", "authority": 0.70},
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "category": "tech", "authority": 0.65},
    {"name": "Wired", "url": "https://www.wired.com/feed/rss", "category": "tech", "authority": 0.65},
    # ── AI ──
    {"name": "MIT Tech Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed", "category": "ai", "authority": 0.75},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/", "category": "ai", "authority": 0.60},
    {"name": "arXiv cs.AI", "url": "https://rss.arxiv.org/rss/cs.AI", "category": "ai", "authority": 0.55},
    {"name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml", "category": "ai", "authority": 0.70},
]

# Authority weight for Hacker News items
HN_AUTHORITY = 0.85

# Category classification keywords (title substring match, case-insensitive)
KEYWORD_WEIGHTS = {
    "ai": [
        "人工智能", "大模型", "生成式", "机器学习", "深度学习", "神经网络",
        "gpt", "llm", "agi", "machine learning", "deep learning", "transformer",
        "openai", "anthropic", "claude", "gemini", "chatgpt", "llama", "agent", "智能体",
    ],
    "finance": [
        "美联储", "加息", "降息", "央行", "通胀", "通缩", "财报", "上市", "融资",
        "并购", "汇率", "利率", "股市", "经济", "衰退", "gdp", "fed", "inflation",
        "earnings", "merger", "acquisition", "stock", "market", "ipo",
    ],
    "tech": [
        "芯片", "半导体", "收购", "裁员", "发布", "突破", "semiconductor", "chip",
        "launch", "startup", "cloud", "quantum",
    ],
}

# Global "breaking / important" boosters
IMPORTANT_KEYWORDS = [
    "breaking", "突破", "重大", "紧急", "纪录", "新高", "崩溃", "暴涨", "暴跌",
    "landmark", "breakthrough", "milestone", "record",
]
