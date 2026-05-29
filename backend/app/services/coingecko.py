from datetime import datetime, timedelta, timezone
from typing import Optional, TypedDict

import httpx

from app.core.config import settings

# Module-level cache is process-local. Requires single Uvicorn worker (--workers 1) to
# guarantee the 60-second TTL across all requests. Adding workers without externalising
# this cache (e.g. Redis) will silently multiply CoinGecko request volume.
_cache: dict[str, list] = {}
_cache_expires_at: Optional[datetime] = None
_TTL = timedelta(seconds=60)

_FIELDS = {"id", "symbol", "name", "current_price", "price_change_percentage_24h", "image"}


class CoinMarket(TypedDict):
    id: str
    symbol: str
    name: str
    current_price: float
    price_change_percentage_24h: Optional[float]
    image: str


def _prune(data: list[dict]) -> list[CoinMarket]:
    return [{k: v for k, v in coin.items() if k in _FIELDS} for coin in data]  # type: ignore[return-value]


def _normalise_ids(ids: str) -> str:
    return ",".join(sorted(ids.split(",")))


async def get_markets(ids: Optional[str] = None) -> list[CoinMarket]:
    global _cache, _cache_expires_at

    now = datetime.now(timezone.utc)
    cache_key = _normalise_ids(ids) if ids else "__all__"

    if cache_key in _cache and _cache_expires_at and now < _cache_expires_at:
        return _cache[cache_key]

    params: dict[str, str | int] = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 100,
        "price_change_percentage": "24h",
    }
    if ids:
        params["ids"] = cache_key  # use normalised form for consistent API calls

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{settings.coingecko_base_url}/coins/markets", params=params)

    if response.status_code == 429:
        raise httpx.HTTPStatusError("rate limited", request=response.request, response=response)

    response.raise_for_status()
    data = _prune(response.json())

    _cache[cache_key] = data
    _cache_expires_at = now + _TTL
    return data
