import logging
from datetime import datetime, timezone
from typing import Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import distinct, select
from app.core.config import settings
from app.db.base import async_session
from app.db.models import Alert, AlertCondition, AlertHistory, User, WatchlistItem
from app.services.coingecko import CoinMarket, get_markets
from app.services.publisher import publish_alert_event

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

def _condition_matches(
    condition: AlertCondition,
    threshold: float,
    current_price: float,
    change_24h: float | None,
) -> bool:
    if condition == AlertCondition.price_above:
        return current_price > threshold
    if condition == AlertCondition.price_below:
        return current_price < threshold
    if change_24h is None:
        return False
    if condition == AlertCondition.change_above:
        return change_24h > threshold
    if condition == AlertCondition.change_below:
        return change_24h < threshold
    return False


def _alert_message(
    alert: Alert,
    user_email: str,
    current_price: float,
    change_24h: float | None,
    triggered_at: datetime,
) -> dict[str, Any]:
    return {
        "alert_id": str(alert.id),
        "user_email": user_email,
        "coin_id": alert.coin_id,
        "coin_name": alert.coin_name,
        "condition": alert.condition.value,
        "threshold": alert.threshold,
        "triggered_price": current_price,
        "change_24h": change_24h,
        "triggered_at": triggered_at.isoformat(),
    }


async def _get_watched_coin_ids() -> list[str]:
    async with async_session() as session:
        result = await session.execute(select(distinct(WatchlistItem.coin_id)))
        return list(result.scalars().all())

async def check_prices() -> None:
    coin_ids = await _get_watched_coin_ids()
    if not coin_ids:
        return

    markets = await get_markets(ids=",".join(coin_ids))
    prices_by_coin_id: dict[str, CoinMarket] = {market["id"]: market for market in markets}
    if not prices_by_coin_id:
        return

    messages: list[dict[str, Any]] = []
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Alert, User.email)
                .join(User, Alert.user_id == User.id)
                .where(
                    Alert.is_active.is_(True),
                    Alert.coin_id.in_(prices_by_coin_id.keys()),
                )
                .with_for_update(of=Alert)
            )

            for alert, user_email in result.all():
                market = prices_by_coin_id[alert.coin_id]
                current_price = market["current_price"]
                change_24h = market["price_change_percentage_24h"]

                if not _condition_matches(alert.condition, alert.threshold, current_price, change_24h):
                    continue

                triggered_at = datetime.now(timezone.utc)
                alert.is_active = False
                session.add(
                    AlertHistory(
                        alert_id=alert.id,
                        user_id=alert.user_id,
                        coin_id=alert.coin_id,
                        coin_name=alert.coin_name,
                        condition=alert.condition,
                        threshold=alert.threshold,
                        price_at_trigger=current_price,
                        change_24h=change_24h,
                        triggered_at=triggered_at,
                    )
                )
                messages.append(
                    _alert_message(alert, user_email, current_price, change_24h, triggered_at)
                )

    for message in messages:
        await publish_alert_event(message)


def start_scheduler() -> None:
    if scheduler.running:
        return

    scheduler.add_job(
        check_prices,
        "interval",
        seconds=settings.poll_interval_seconds,
        id="check_prices",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Scheduler started")


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
