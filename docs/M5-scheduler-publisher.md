# M5 — Scheduler + Alert Evaluator + RabbitMQ Publisher

**Day**: May 30 | **Owner**: Person A | **Blocks**: M6 | **Blocked by**: M1, M3, M4

## Goal

APScheduler job runs every 120 s inside FastAPI's lifespan, fetches prices for all watched coins, evaluates active alerts, and publishes triggered alerts to RabbitMQ.

**Integration Technique 2 — Messaging**: the scheduler publishes alert events to a RabbitMQ queue; the worker consumes them independently and asynchronously.

## Acceptance Criteria

- [ ] Scheduler starts in `lifespan` and logs `"Scheduler started"`
- [ ] Each run: one DB query to get distinct `coin_id`s from `WatchlistItem`; one CoinGecko call (cache hit path from M3)
- [ ] For each `Alert` where `is_active=True`: evaluate condition; on match → set `is_active=False`, write `AlertHistory` row, publish message — all in one DB transaction before publish
- [ ] Published message JSON: `{alert_id, user_email, coin_id, coin_name, condition, threshold, triggered_price, change_24h, triggered_at}`
- [ ] Log: `"Published alert {alert_id} to RabbitMQ"` on each publish
- [ ] No alert fires twice (deactivated on first trigger)

## Key Files

```
backend/app/services/
├── scheduler.py    # APScheduler setup, check_prices() job
└── publisher.py    # aio-pika connect_robust + publish logic
```

## Critical Notes

- **Use `aio_pika.connect_robust()`** — CloudAMQP drops idle connections after 60 s; robust connections auto-reconnect
- Create a fresh `AsyncSession` inside the job function — never share the outer FastAPI session
- Write `test_publish.py` first: standalone script that publishes a hardcoded message to CloudAMQP and verifies it appears in the dashboard. Isolates the aio-pika learning curve before integrating with the scheduler

## Condition Evaluation

| Condition | Triggers when |
|---|---|
| `price_above` | `current_price > threshold` |
| `price_below` | `current_price < threshold` |
| `change_above` | `change_24h > threshold` |
| `change_below` | `change_24h < threshold` |
