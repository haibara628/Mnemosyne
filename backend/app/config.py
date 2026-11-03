"""Application configuration via pydantic-settings."""

from pathlib import Path
from typing import List

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Data directory — SQLite DB + uploads live here.
    # Set via MNEMOSYNE_DATA_DIR env var (or backend/.env).
    data_dir: str = Field(default="./data", validation_alias="MNEMOSYNE_DATA_DIR")

    # Note markdown bodies live here (SQLite only keeps metadata + content_text for FTS).
    # Defaults to {data_dir}/notes; override with MNEMOSYNE_NOTES_DIR (point it at the NAS).
    notes_dir: str = Field(default="", validation_alias="MNEMOSYNE_NOTES_DIR")

    # File storage
    max_upload_size_mb: int = 50

    # Uploads (attachments) — should also point at the NAS in production; set
    # MNEMOSYNE_UPLOAD_DIR. Defaults to {data_dir}/uploads.
    upload_dir: str = Field(default="", validation_alias="MNEMOSYNE_UPLOAD_DIR")

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:8000"]

    # AI (Phase 3)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-20251001"

    # Chat — local Ollama + cloud OpenAI-compatible endpoints
    ollama_base_url: str = "http://localhost:11434/v1"
    openai_base_url: str = "https://api.deepseek.com/v1"
    openai_api_key: str = Field(default="", validation_alias="DEEPSEEK_API_KEY")
    default_chat_model: str = "qwen2.5:14b"

    # Crawler
    crawl_user_agent: str = "CPKB-Crawler/1.0"
    crawl_timeout_seconds: int = 30

    # News collector
    max_articles_per_run: int = 100
    news_http_timeout: int = 20
    # RSSHub 地址(把雪球/财新/华尔街见闻等无公开 RSS 的财经站转成 RSS)。
    # 默认本机 127.0.0.1:1200(ECS 上跑着 RSSHub 容器);本地无 RSSHub 时设为空字符串可禁用财经源。
    rsshub_base_url: str = Field(default="http://127.0.0.1:1200", validation_alias="RSSHUB_BASE_URL")

    @model_validator(mode="after")
    def _resolve_storage_dirs(self) -> "Settings":
        """Derive notes_dir/upload_dir from data_dir when their env vars are unset."""
        if not self.notes_dir:
            self.notes_dir = str(Path(self.data_dir) / "notes")
        if not self.upload_dir:
            self.upload_dir = str(Path(self.data_dir) / "uploads")
        return self

    @property
    def database_url(self) -> str:
        """SQLite URL derived from data_dir (absolute paths yield 4 slashes)."""
        db_path = Path(self.data_dir) / "cpkb.db"
        return f"sqlite+aiosqlite:///{db_path}"


settings = Settings()

# Ensure data directories exist
Path(settings.data_dir).mkdir(parents=True, exist_ok=True)
Path(settings.notes_dir).mkdir(parents=True, exist_ok=True)
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
