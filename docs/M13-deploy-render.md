# M13 - Deploy API + Worker to Render

**Day**: June 1 | **Owner**: Person A | **Blocks**: M14 | **Blocked by**: all backend milestones, M12

## Goal

FastAPI API, frontend, and standalone worker are live on Render, connected to production Postgres and CloudAMQP.

## Acceptance Criteria

- [ ] `GET https://<api>.onrender.com/health` → `{"status": "ok"}`
- [ ] `GET https://<api>.onrender.com/docs` → Swagger UI loads
- [ ] Worker service exists as a Render Background Worker named `crypto-alert-worker`
- [ ] Worker service logs show `"Waiting for messages on queue: price_alerts_queue"`
- [ ] End-to-end smoke test passes: register → add coin → create alert → scheduler triggers → email received

## Current Fix

The repository already contains a worker implementation at `backend/worker/main.py`. If production only has the API and frontend services, apply the Blueprint from `render.yaml` again or manually create the missing Render Background Worker with the settings below.

`render.yaml` now points all services at `main`, so Render builds the same branch that receives the current deploy fixes. Previously, services were pinned to `test/deploy`, which can cause Render to keep building an older branch.

## Render Service Configuration

### API Service (Web Service)
| Field | Value |
|---|---|
| Build command | `pip install -r backend/requirements.txt` |
| Start command | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Branch | `main` |

### Worker Service (Background Worker)
| Field | Value |
|---|---|
| Service type | Background Worker |
| Build command | `pip install -r backend/requirements.txt` |
| Start command | `cd backend && python -m worker.main` |
| Branch | `main` |
| Instance type | `starter` or another paid worker-capable instance |

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

The worker requires `DATABASE_URL`, `RABBITMQ_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `JWT_SECRET`, and `JWT_ALGORITHM`. `POLL_INTERVAL_SECONDS` and `COINGECKO_BASE_URL` are used by the API scheduler, not by the worker.

`RESEND_FROM_EMAIL` must use a verified domain, for example `alerts@alerts.yourdomain.com`. The default Resend testing domain (`resend.dev`, including `onboarding@resend.dev`) can only send to the Resend account owner's email address.

## Deploy Order

1. Render Postgres → copy internal URL
2. Run migrations (tables created by `create_tables()` on first startup)
3. Deploy API service → verify `/health`
4. Deploy Worker service → verify logs
5. Run smoke test

## Manual Worker Creation

If the Blueprint does not create the missing service automatically:

1. In Render, create **New > Background Worker** from the GitHub repo.
2. Select branch `main`.
3. Use build command `pip install -r backend/requirements.txt`.
4. Use start command `cd backend && python -m worker.main`.
5. Set the env vars listed above, using the same `RABBITMQ_URL` as the API.
6. Deploy and verify the log line `Waiting for messages on queue: price_alerts_queue`.
