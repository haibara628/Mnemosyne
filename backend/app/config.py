"""Application configuration via pydantic-settings."""

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/cpkb.db"

    # File storage
    upload_dir: str = "./data/uploads"
    max_upload_size_mb: int = 50

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:8000"]

    # AI (Phase 3)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-20251001"

    # Crawler
    crawl_user_agent: str = "CPKB-Crawler/1.0"
    crawl_timeout_seconds: int = 30

    # News collector
    max_articles_per_run: int = 100
    news_http_timeout: int = 20


settings = Settings()

# Ensure data directories exist
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Path("./data").mkdir(parents=True, exist_ok=True)
