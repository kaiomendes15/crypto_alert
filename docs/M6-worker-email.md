# M6 — RabbitMQ Worker + Resend Email

**Day**: May 30 | **Owner**: Person C | **Blocks**: M11, M13 | **Blocked by**: M12

## Goal

Standalone Python process subscribes to RabbitMQ and sends a transactional email via Resend for every triggered alert message.

**Integration Technique 3 — Pub/Sub**: the worker is a subscriber that reacts to alert events without knowing who published them. Deployed as a separate Render Background Worker service.

## Acceptance Criteria

- [ ] Worker starts with `python -m worker.main` and logs `"Waiting for messages on queue: price_alerts"`
- [ ] On each message: parses JSON, calls `resend.Emails.send(...)` with HTML body (coin name, condition, threshold, triggered price, timestamp)
- [ ] Acks on success; nacks with `requeue=False` on failure
- [ ] Email arrives in the test inbox during local demo

## Key Files

```
backend/worker/
├── __init__.py
└── main.py    # aio-pika consumer + Resend send
```

## RabbitMQ Topology

```
Exchange:    alerts_exchange  (type: direct, durable)
Queue:       price_alerts_queue  (durable)
Routing key: alert.triggered
```

## Email Template

Subject: `🚨 CryptoAlert: {coin_name} {condition} {threshold}`

Body (HTML):
- Coin name + symbol
- Condition triggered
- Your threshold vs actual price
- Timestamp

## Deployment

Deployed as a **separate Render Background Worker** service (not part of the API service):
- Start command: `python -m worker.main`
- Same env vars as API: `RABBITMQ_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
