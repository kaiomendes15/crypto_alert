from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.db.models import User
from app.services.coingecko import get_markets

router = APIRouter(prefix="/coins", tags=["coins"])


class CoinMarketResponse(BaseModel):
    id: str
    symbol: str
    name: str
    current_price: float
    price_change_percentage_24h: Optional[float] = None
    image: str


@router.get("/markets", response_model=list[CoinMarketResponse])
async def coins_markets(
    ids: Optional[str] = Query(None, description="Comma-separated CoinGecko coin IDs"),
    _: User = Depends(get_current_user),
):
    try:
        return await get_markets(ids=ids)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="retry in 60s",
            )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="CoinGecko error")
