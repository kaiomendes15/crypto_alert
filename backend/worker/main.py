import asyncio
import json
import logging
import os
import sys
from typing import Any

import aio_pika
import resend
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

RABBITMQ_URL = os.environ["RABBITMQ_URL"]
RESEND_API_KEY = os.environ["RESEND_API_KEY"]
RESEND_FROM_EMAIL = os.environ["RESEND_FROM_EMAIL"]
QUEUE_NAME = os.getenv("ALERT_QUEUE_NAME", "alerts")

resend.api_key = RESEND_API_KEY

CONDITION_LABELS = {
    "price_above": "rose above",
    "price_below": "dropped below",
    "change_above": "24h change exceeded",
    "change_below": "24h change fell below",
}


def _format_threshold(condition: str, threshold: float) -> str:
    if condition in ("change_above", "change_below"):
        return f"{threshold:+.2f}%"
    return f"${threshold:,.2f}"


def _format_price(condition: str, price: float) -> str:
    if condition in ("change_above", "change_below"):
        return f"{price:+.2f}%"
    return f"${price:,.2f}"


def _build_email(data: dict[str, Any]) -> tuple[str, str]:
    coin_name = data.get("coin_name", data.get("coin_id", "Unknown"))
    condition = data.get("condition", "")
    threshold = float(data.get("threshold", 0))
    triggered_price = float(data.get("triggered_price", 0))
    change_24h = data.get("change_24h")
    triggered_at = data.get("triggered_at", "")

    condition_label = CONDITION_LABELS.get(condition, condition)
    threshold_str = _format_threshold(condition, threshold)
    price_str = _format_price(condition, triggered_price)

    subject = f"\U0001f6a8 CryptoAlert: {coin_name} {condition_label} {threshold_str}"

    change_row = ""
    if change_24h is not None:
        change_color = "#00e676" if float(change_24h) >= 0 else "#ff5252"
        change_row = f"""
        <tr>
          <td style="padding:8px 0;color:#9fb4a7;">24h Change</td>
          <td style="padding:8px 0;color:{change_color};font-weight:bold;">{float(change_24h):+.2f}%</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#050806;color:#f0fff5;font-family:monospace;padding:32px;">
  <div style="max-width:520px;margin:0 auto;border:1px solid #193823;padding:32px;background:#0b0f0c;">
    <h2 style="color:#00e676;margin:0 0 8px;">\U0001f6a8 CryptoAlert</h2>
    <p style="color:#9fb4a7;margin:0 0 24px;font-size:13px;">Alert condition triggered</p>
    <h3 style="color:#f0fff5;margin:0 0 24px;font-size:20px;">{coin_name}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#9fb4a7;border-bottom:1px solid #193823;">Condition</td>
        <td style="padding:8px 0;color:#f0fff5;border-bottom:1px solid #193823;font-weight:bold;">{condition_label.upper()}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9fb4a7;border-bottom:1px solid #193823;">Your threshold</td>
        <td style="padding:8px 0;color:#f0fff5;border-bottom:1px solid #193823;">{threshold_str}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9fb4a7;border-bottom:1px solid #193823;">Triggered at</td>
        <td style="padding:8px 0;color:#00e676;border-bottom:1px solid #193823;font-weight:bold;">{price_str}</td>
      </tr>{change_row}
      <tr>
        <td style="padding:8px 0;color:#9fb4a7;">Timestamp</td>
        <td style="padding:8px 0;color:#9fb4a7;font-size:12px;">{triggered_at}</td>
      </tr>
    </table>
    <p style="color:#193823;font-size:11px;margin:32px 0 0;border-top:1px solid #193823;padding-top:16px;">
      CryptoAlert — automated alert notification
    </p>
  </div>
</body>
</html>"""

    return subject, html


async def _process_message(message: aio_pika.IncomingMessage) -> None:
    try:
        data = json.loads(message.body)
    except json.JSONDecodeError as exc:
        logger.error("Malformed message body, discarding: %s", exc)
        await message.nack(requeue=False)
        return

    user_email = data.get("user_email")
    if not user_email:
        logger.error("Message missing user_email, discarding: %s", data)
        await message.nack(requeue=False)
        return

    alert_id = data.get("alert_id", "?")
    logger.info("Processing alert %s for %s", alert_id, user_email)

    subject, html = _build_email(data)

    try:
        resend.Emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": [user_email],
            "subject": subject,
            "html": html,
        })
        logger.info("Email sent for alert %s to %s", alert_id, user_email)
        await message.ack()
    except Exception as exc:
        logger.error("Resend error for alert %s: %s", alert_id, exc)
        await message.nack(requeue=False)


async def main() -> None:
    logger.info("Connecting to RabbitMQ...")
    connection = await aio_pika.connect_robust(RABBITMQ_URL)

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=10)

        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        logger.info("Waiting for messages on queue: %s", QUEUE_NAME)

        await queue.consume(_process_message)
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped")
        sys.exit(0)
