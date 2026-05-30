from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db
from app.db.models import User, WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchlistItemCreate(BaseModel):
    coin_id: str = Field(min_length=1)


class WatchlistItemResponse(BaseModel):
    id: str
    coin_id: str
    added_at: datetime


@router.get("", response_model=list[WatchlistItemResponse])
async def list_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.added_at.desc())
    )
    items = result.scalars().all()
    return [
        WatchlistItemResponse(id=str(item.id), coin_id=item.coin_id, added_at=item.added_at)
        for item in items
    ]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WatchlistItemResponse)
async def add_watchlist_item(
    body: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    coin_id = body.coin_id.strip()
    if not coin_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Informe um coin_id válido")
    existing = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == current_user.id,
            WatchlistItem.coin_id == coin_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Moeda já está na watchlist")

    item = WatchlistItem(user_id=current_user.id, coin_id=coin_id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return WatchlistItemResponse(id=str(item.id), coin_id=item.coin_id, added_at=item.added_at)

@router.delete("/{coin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist_item(
    coin_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == current_user.id,
            WatchlistItem.coin_id == coin_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moeda não está na watchlist")

    await db.delete(item)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
