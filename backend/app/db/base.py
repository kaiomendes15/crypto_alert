from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def create_tables() -> None:
    from app.db import models  # noqa: F401 — ensures models are registered

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
