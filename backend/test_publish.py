"""Standalone publish test — isolates the RabbitMQ path from the scheduler.

Publishes one hardcoded alert message to RabbitMQ via the same code path the
scheduler uses (`app.services.publisher.publish_alert_event`). Run the worker
in another terminal first, then run this to confirm the message is consumed and
the email arrives.

Usage:
    source venv/bin/activate
    python test_publish.py you@example.com        # recipient as arg
    TEST_EMAIL=you@example.com python test_publish.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

from app.core.config import settings
from app.services.publisher import publish_alert_event


async def main() -> None:
    if not settings.rabbitmq_url:
        raise SystemExit("RABBITMQ_URL is not set in .env — fill it in (M12) first")

    recipient = sys.argv[1] if len(sys.argv) > 1 else os.getenv("TEST_EMAIL", "test@example.com")
    print(f"Publishing test message for {recipient} to queue '{settings.alert_queue_name}'...")

    await publish_alert_event(
        {
            "alert_id": "00000000-0000-0000-0000-000000000000",
            "user_email": recipient,
            "coin_id": "bitcoin",
            "coin_name": "Bitcoin",
            "condition": "price_above",
            "threshold": 100000.0,
            "triggered_price": 101000.0,
            "change_24h": 2.5,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    print("Published. Check the worker logs and the inbox.")


if __name__ == "__main__":
    asyncio.run(main())
