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
    # ── 中文 ──
    {"name": "IT之家", "url": "https://www.ithome.com/rss/", "category": "tech", "authority": 0.60},
    {"name": "少数派", "url": "https://sspai.com/feed", "category": "tech", "authority": 0.60},
    {"name": "极客公园", "url": "https://www.geekpark.net/rss", "category": "tech", "authority": 0.55},
    {"name": "爱范儿", "url": "https://www.ifanr.com/feed", "category": "tech", "authority": 0.55},
    {"name": "量子位", "url": "https://www.qbitai.com/feed", "category": "ai", "authority": 0.60},
]

# 中文财经源(雪球/财新/华尔街见闻/财联社/第一财经无公开 RSS),经 RSSHub 转换。
# 只存路由路径;完整 URL = rsshub_base_url + route(见 get_rsshub_sources)。
# 雪球/36氪 反爬返回 503,需 RSSHub 配 headless 浏览器,暂未加入。
RSSHUB_FINANCE_SOURCES = [
    {"name": "财新", "route": "/caixin/latest", "category": "finance", "authority": 0.85},
    {"name": "华尔街见闻·全球", "route": "/wallstreetcn/news/global", "category": "finance", "authority": 0.70},
    {"name": "华尔街见闻·中国", "route": "/wallstreetcn/news/china", "category": "finance", "authority": 0.70},
    {"name": "华尔街见闻·快讯", "route": "/wallstreetcn/live/global", "category": "finance", "authority": 0.65},
    {"name": "第一财经", "route": "/yicai/news", "category": "finance", "authority": 0.65},
    {"name": "第一财经·头条", "route": "/yicai/headline", "category": "finance", "authority": 0.65},
    {"name": "财联社·电报", "route": "/cls/telegraph", "category": "finance", "authority": 0.75},
    {"name": "财联社·深度", "route": "/cls/depth", "category": "finance", "authority": 0.70},
]


def get_rsshub_sources(base_url: str) -> list:
    """把 RSSHub 财经源路由展开成完整 feed 配置;base_url 为空则返回空列表(禁用)。"""
    if not base_url:
        return []
    base = base_url.rstrip("/")
    return [
        {
            "name": s["name"],
            "url": base + s["route"],
            "category": s["category"],
            "authority": s["authority"],
        }
        for s in RSSHUB_FINANCE_SOURCES
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
