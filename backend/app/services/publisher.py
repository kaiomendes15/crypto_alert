import asyncio
import json
import logging
from datetime import datetime
from enum import Enum
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import AbstractRobustConnection, AbstractRobustExchange

from app.core.config import settings
from app.core.messaging import EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEY

logger = logging.getLogger(__name__)

# A single robust connection/exchange is created lazily and reused across publishes.
# connect_robust auto-reconnects (and re-declares) after CloudAMQP's 60s idle drop, so
# we must NOT open a fresh connection per message — that adds seconds of TLS handshake
# latency to every alert and defeats the point of a robust connection.
_connection: AbstractRobustConnection | None = None
_exchange: AbstractRobustExchange | None = None
_lock = asyncio.Lock()


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return str(value)


async def _get_exchange() -> AbstractRobustExchange:
    global _connection, _exchange

    if _exchange is not None and _connection is not None and not _connection.is_closed:
        return _exchange

    async with _lock:
        # Re-check inside the lock in case another task connected while we waited.
        if _exchange is not None and _connection is not None and not _connection.is_closed:
            return _exchange

        _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        channel = await _connection.channel()
        exchange = await channel.declare_exchange(
            EXCHANGE_NAME, ExchangeType.DIRECT, durable=True
        )
        # Declare + bind the queue here too so messages are never dropped when the
        # worker hasn't started yet (an unrouted message on a direct exchange is lost).
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        await queue.bind(exchange, routing_key=ROUTING_KEY)

        _exchange = exchange
        return _exchange


async def publish_alert_event(message: dict[str, Any]) -> None:
    if not settings.rabbitmq_url:
        logger.warning("RABBITMQ_URL is not configured; skipping alert publish")
        return

    exchange = await _get_exchange()
    body = json.dumps(message, default=_json_default).encode()

    await exchange.publish(
        Message(body=body, delivery_mode=DeliveryMode.PERSISTENT),
        routing_key=ROUTING_KEY,
    )

    logger.info("Published alert %s to RabbitMQ", message["alert_id"])
