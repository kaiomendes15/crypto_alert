# M13 — Deploy API + Worker to Render

**Day**: June 1 | **Owner**: Person A | **Blocks**: M14 | **Blocked by**: all backend milestones, M12

## Goal

FastAPI API and standalone worker are both live on Render, connected to production Postgres and CloudAMQP.

## Acceptance Criteria

- [ ] `GET https://<api>.onrender.com/health` → `{"status": "ok"}`
- [ ] `GET https://<api>.onrender.com/docs` → Swagger UI loads
- [ ] Worker service logs show `"Waiting for messages on queue: price_alerts"`
- [ ] End-to-end smoke test passes: register → add coin → create alert → scheduler triggers → email received

## Render Service Configuration

### API Service (Web Service)
| Field | Value |
|---|---|
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Root directory | `backend/` |

### Worker Service (Background Worker)
| Field | Value |
|---|---|
| Build command | `pip install -r requirements.txt` |
| Start command | `python -m worker.main` |
| Root directory | `backend/` |

### Env Vars (set on both services)

```
DATABASE_URL       postgresql+asyncpg://...  (Render Postgres internal URL)
RABBITMQ_URL       amqps://...               (CloudAMQP URL)
RESEND_API_KEY     re_...
RESEND_FROM_EMAIL  alerts@yourdomain.com
JWT_SECRET         <strong random string>
JWT_ALGORITHM      HS256
POLL_INTERVAL_SECONDS  120
COINGECKO_BASE_URL https://api.coingecko.com/api/v3
```

## Deploy Order

1. Render Postgres → copy internal URL
2. Run migrations (tables created by `create_tables()` on first startup)
3. Deploy API service → verify `/health`
4. Deploy Worker service → verify logs
5. Run smoke test
