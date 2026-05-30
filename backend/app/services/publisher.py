import json
import logging
from datetime import datetime
from enum import Enum
from typing import Any
import aio_pika
from aio_pika import DeliveryMode, Message
from app.core.config import settings

logger = logging.getLogger(__name__)

def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return str(value)


async def publish_alert_event(message: dict[str, Any]) -> None:
    if not settings.rabbitmq_url:
        logger.warning("RABBITMQ_URL is not configured; skipping alert publish")
        return

    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(settings.alert_queue_name, durable=True)
        body = json.dumps(message, default=_json_default).encode()

        await channel.default_exchange.publish(
            Message(body=body, delivery_mode=DeliveryMode.PERSISTENT),
            routing_key=queue.name,
        )

    logger.info("Published alert %s to RabbitMQ", message["alert_id"])
