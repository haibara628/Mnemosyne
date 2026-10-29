"""系统设置 API 路由(数据目录等)。"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["settings"])

# .env 位于 backend 目录下(本文件为 backend/app/api/settings.py)。
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
ENV_KEY = "MNEMOSYNE_DATA_DIR"
VERSION = "0.1.0"


class SettingsOut(BaseModel):
    data_dir: str
    database_url: str
    upload_dir: str
    version: str


class DataDirUpdate(BaseModel):
    data_dir: str


class DataDirUpdateOut(BaseModel):
    data_dir: str
    restart_required: bool
    message: str


@router.get("/settings", response_model=SettingsOut)
async def get_settings():
    """返回当前数据目录、数据库/上传路径与版本。"""
    return SettingsOut(
        data_dir=settings.data_dir,
        database_url=settings.database_url,
        upload_dir=settings.upload_dir,
        version=VERSION,
    )


@router.post("/settings/data-dir", response_model=DataDirUpdateOut)
async def set_data_dir(body: DataDirUpdate):
    """更新 .env 中的 MNEMOSYNE_DATA_DIR;只改配置,不移动数据,需重启生效。"""
    new_dir = body.data_dir.strip()
    if not new_dir:
        raise HTTPException(status_code=422, detail="data_dir 不能为空")

    path = Path(new_dir).expanduser()
    if not path.is_absolute():
        raise HTTPException(status_code=422, detail="data_dir 必须是绝对路径")

    normalized = str(path)

    lines = ENV_FILE.read_text(encoding="utf-8").splitlines() if ENV_FILE.exists() else []

    updated: list[str] = []
    replaced = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(f"{ENV_KEY}=") or stripped.startswith(f"{ENV_KEY} ="):
            updated.append(f"{ENV_KEY}={normalized}")
            replaced = True
        else:
            updated.append(line)

    if not replaced:
        updated.append(f"{ENV_KEY}={normalized}")

    content = "\n".join(updated)
    if not content.endswith("\n"):
        content += "\n"
    ENV_FILE.write_text(content, encoding="utf-8")

    return DataDirUpdateOut(
        data_dir=normalized,
        restart_required=True,
        message="配置已写入 .env,数据不会自动迁移(请手动迁移 data/ 目录),需重启后端生效",
    )
