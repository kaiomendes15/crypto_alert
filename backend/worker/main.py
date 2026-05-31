"""Standalone RabbitMQ consumer that sends alert emails via Resend.

Integration Technique 3 — Pub/Sub. This process subscribes to the
`price_alerts_queue` and reacts to alert events published by the scheduler
(M5) without any shared state or direct coupling to the publisher. Deployed
as a separate Render Background Worker.
"""

import asyncio
import json
import logging

import aio_pika
import resend

from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [worker] %(message)s",
)
logger = logging.getLogger(__name__)

# Human-readable labels for the Alert.condition enum values.
CONDITION_LABELS = {
    "price_above": "Price above",
    "price_below": "Price below",
    "change_above": "24h change above",
    "change_below": "24h change below",
}


def _format_condition(condition: str, threshold) -> str:
    label = CONDITION_LABELS.get(condition, condition)
    if condition in ("change_above", "change_below"):
        return f"{label} {threshold}%"
    return f"{label} ${threshold}"


def _build_email_html(data: dict) -> str:
    condition = data.get("condition", "")
    threshold = data.get("threshold")
    coin_name = data.get("coin_name") or data.get("coin_id", "")
    triggered_price = data.get("triggered_price")
    change_24h = data.get("change_24h")
    triggered_at = data.get("triggered_at", "")

    return f"""\
<div style="background:#050806;color:#9fb4a7;font-family:'Courier New',monospace;
            padding:32px;border:1px solid #193823;">
  <h1 style="color:#2dff8f;font-size:20px;margin:0 0 24px;letter-spacing:1px;">
    🚨 CRYPTOALERT TRIGGERED
  </h1>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr>
      <td style="padding:8px 0;color:#9fb4a7;">Coin</td>
      <td style="padding:8px 0;color:#f0fff5;text-align:right;">{coin_name}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9fb4a7;">Condition</td>
      <td style="padding:8px 0;color:#f0fff5;text-align:right;">
        {_format_condition(condition, threshold)}
      </td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9fb4a7;">Triggered price</td>
      <td style="padding:8px 0;color:#00e676;text-align:right;">${triggered_price}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9fb4a7;">24h change</td>
      <td style="padding:8px 0;color:#f0fff5;text-align:right;">{change_24h}%</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9fb4a7;">Triggered at</td>
      <td style="padding:8px 0;color:#f0fff5;text-align:right;">{triggered_at}</td>
    </tr>
  </table>
</div>"""


def _send_email(data: dict) -> None:
    """Blocking Resend call — runs in a thread via asyncio.to_thread."""
    condition = data.get("condition", "")
    threshold = data.get("threshold")
    coin_name = data.get("coin_name") or data.get("coin_id", "")
    subject = f"🚨 CryptoAlert: {coin_name} {_format_condition(condition, threshold)}"

    resend.Emails.send(
        {
            "from": settings.resend_from_email,
            "to": data["user_email"],
            "subject": subject,
            "html": _build_email_html(data),
        }
    )


async def on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    try:
        data = json.loads(message.body.decode())
        await asyncio.to_thread(_send_email, data)
        await message.ack()
        logger.info("Email sent for alert %s; message acked", data.get("alert_id"))
    except Exception:
        logger.exception("Failed to process message; nacking without requeue")
        await message.nack(requeue=False)


async def main() -> None:
    if not settings.rabbitmq_url:
        raise RuntimeError("RABBITMQ_URL is not configured")
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY is not set; email sends will fail")

    resend.api_key = settings.resend_api_key

    # connect_robust auto-reconnects — CloudAMQP drops idle connections after 60s.
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=10)
        queue = await channel.declare_queue(settings.alert_queue_name, durable=True)

        logger.info("Waiting for messages on queue: %s", settings.alert_queue_name)
        await queue.consume(on_message)

        # Block forever; the consumer runs in the background.
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped")
