"""CLI entrypoint: run a single news collection pass.

Invoked hourly by the systemd timer (deploy/mnemosyne-news.{service,timer}).
"""

import asyncio
import logging

from app.database import async_session, init_db
from app.services.news_service import collect_news

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def main() -> None:
    await init_db()
    async with async_session() as db:
        result = await collect_news(db)
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
