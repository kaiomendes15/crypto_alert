import asyncio
import logging
import smtplib
import sys
import uuid
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from typing import Any

import aio_pika
import httpx
import json
from aio_pika import ExchangeType
from sqlalchemy import update

from app.core.config import settings
from app.core.messaging import EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEY
from app.db.base import async_session
from app.db.models import AlertHistory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

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


def _brevo_sender() -> dict[str, str]:
    parsed_name, parsed_email = parseaddr(settings.brevo_from_email)
    sender_email = parsed_email or settings.brevo_from_email
    sender_name = settings.brevo_from_name or parsed_name or "CryptoAlert"
    return {"name": sender_name, "email": sender_email}


def _sender_header() -> str:
    sender = _brevo_sender()
    return formataddr((sender["name"], sender["email"]))


async def _send_email_via_api(user_email: str, subject: str, html: str) -> None:
    payload = {
        "sender": _brevo_sender(),
        "to": [{"email": user_email}],
        "subject": subject,
        "htmlContent": html,
    }
    headers = {
        "accept": "application/json",
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(settings.brevo_api_url, headers=headers, json=payload)

    if response.is_error:
        raise RuntimeError(
            f"Brevo returned HTTP {response.status_code}: {response.text[:500]}"
        )


def _send_email_via_smtp_sync(user_email: str, subject: str, html: str) -> None:
    message = EmailMessage()
    message["From"] = _sender_header()
    message["To"] = user_email
    message["Subject"] = subject
    message.set_content("CryptoAlert notification. Open this email in an HTML-capable client.")
    message.add_alternative(html, subtype="html")

    with smtplib.SMTP(settings.brevo_smtp_host, settings.brevo_smtp_port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(settings.brevo_smtp_login, settings.brevo_smtp_password)
        smtp.send_message(message)


async def _send_email(user_email: str, subject: str, html: str) -> None:
    if settings.email_provider == "brevo_smtp":
        await asyncio.to_thread(_send_email_via_smtp_sync, user_email, subject, html)
        return

    await _send_email_via_api(user_email, subject, html)


async def _mark_email_sent(history_id: str) -> None:
    """Best-effort flag flip after a successful send. The email already went out, so a
    failure here is logged but never re-sends or re-queues the message."""
    try:
        async with async_session() as session:
            await session.execute(
                update(AlertHistory)
                .where(AlertHistory.id == uuid.UUID(history_id))
                .values(email_sent=True)
            )
            await session.commit()
    except Exception as exc:
        logger.warning("Email sent but could not mark history %s as sent: %s", history_id, exc)


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
        await _send_email(user_email, subject, html)
    except Exception as exc:
        logger.error("Brevo error for alert %s: %s", alert_id, exc)
        await message.nack(requeue=False)
        return

    logger.info("Email sent for alert %s to %s", alert_id, user_email)

    history_id = data.get("alert_history_id")
    if history_id:
        await _mark_email_sent(history_id)

    await message.ack()


async def main() -> None:
    if not settings.rabbitmq_url:
        logger.error("RABBITMQ_URL is not configured; worker cannot start")
        sys.exit(1)
    if not settings.brevo_from_email:
        logger.error("BREVO_FROM_EMAIL is not configured; worker cannot start")
        sys.exit(1)
    if settings.email_provider == "brevo_smtp":
        if not settings.brevo_smtp_login or not settings.brevo_smtp_password:
            logger.error("BREVO_SMTP_LOGIN / BREVO_SMTP_PASSWORD not configured; worker cannot start")
            sys.exit(1)
    elif not settings.brevo_api_key:
        logger.error("BREVO_API_KEY is not configured; worker cannot start")
        sys.exit(1)

    logger.info("Connecting to RabbitMQ...")
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=10)

        exchange = await channel.declare_exchange(EXCHANGE_NAME, ExchangeType.DIRECT, durable=True)
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        await queue.bind(exchange, routing_key=ROUTING_KEY)
        logger.info("Waiting for messages on queue: %s", QUEUE_NAME)

        await queue.consume(_process_message)
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped")
        sys.exit(0)
