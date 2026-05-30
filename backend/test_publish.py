import asyncio
from datetime import datetime, timezone

from app.services.publisher import publish_alert_event


async def main() -> None:
    await publish_alert_event(
        {
            "alert_id": "00000000-0000-0000-0000-000000000000",
            "user_email": "test@example.com",
            "coin_id": "bitcoin",
            "coin_name": "Bitcoin",
            "condition": "price_above",
            "threshold": 100000.0,
            "triggered_price": 101000.0,
            "change_24h": 2.5,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }
    )


if __name__ == "__main__":
    asyncio.run(main())
