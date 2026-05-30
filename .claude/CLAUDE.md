# CryptoAlert — Project Context

University project. Deadline: **June 1, 2026**. Team of 3, mixed experience (FastAPI/React familiar, RabbitMQ is new).

Graded on:
1. Three integration techniques (REST, Messaging, Pub/Sub) — all must be demonstrable
2. Live deployed URL (Render + Vercel + CloudAMQP)
3. Feature completeness and polish

---

## Stack (locked — do not suggest alternatives)

| Layer | Technology |
|---|---|
| Backend | Python 3.12 + FastAPI |
| ORM | SQLAlchemy async (`asyncpg`) |
| Database | PostgreSQL 16 |
| Message queue | RabbitMQ via CloudAMQP + `aio-pika` |
| HTTP client | `httpx` (async) |
| Auth | `pyjwt` + `bcrypt` |
| Email | Resend Python SDK |
| Price data | CoinGecko free API (no key required) |
| Frontend | React 18 (Vite) + React Router + Axios |
| Deploy | Render (API + Worker + DB) · Vercel (frontend) · CloudAMQP |

---

## Project Structure (target — built milestone by milestone)

```
crypto_alert/
├── .claude/
│   └── CLAUDE.md
├── docker-compose.yml          # Postgres 16 local dev only
├── README.md
├── docs/                       # One .md per milestone (M0–M14)
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + lifespan (scheduler starts here)
│   │   ├── core/
│   │   │   ├── config.py       # pydantic-settings Settings — all env vars
│   │   │   └── dependencies.py # get_db, get_current_user
│   │   ├── db/
│   │   │   ├── base.py         # engine, async_session, Base, create_tables()
│   │   │   └── models.py       # User, WatchlistItem, Alert, AlertHistory
│   │   ├── api/v1/routes/
│   │   │   ├── auth.py         # POST /auth/register, /auth/login
│   │   │   ├── coins.py        # GET /coins/markets
│   │   │   ├── watchlist.py    # CRUD /watchlist
│   │   │   └── alerts.py       # CRUD /alerts, GET /alerts/history
│   │   └── services/
│   │       ├── coingecko.py    # httpx client + 60s TTL cache
│   │       ├── scheduler.py    # APScheduler job — price check + alert eval
│   │       └── publisher.py    # aio-pika publish to RabbitMQ
│   ├── worker/
│   │   └── main.py             # Standalone consumer → Resend email
│   ├── requirements.txt
│   ├── .env                    # Local only, never committed
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api.js              # Axios instance with JWT interceptor
    │   ├── App.jsx             # React Router — routes + ProtectedRoute
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx   # Live prices, polls every 30s
    │   │   ├── Watchlist.jsx   # Add/remove coins
    │   │   ├── Alerts.jsx      # Create/delete alert rules
    │   │   └── History.jsx     # Triggered alerts log
    │   └── components/
    │       └── ProtectedRoute.jsx
    ├── .env                    # Local only, never committed
    ├── .env.example
    └── package.json
```

---

## Milestones

Full details for each milestone live in `docs/M<N>-*.md`. Update the Status column as work completes.

| ID | Goal | Owner | Day | Blocked by | Blocks | Integration | Status |
|---|---|---|---|---|---|---|---|
| M0 | Project scaffold: folders, configs, Docker Compose, requirements | Person A | May 29 | — | M1, M2, M3 | — | ✅ Done |
| M1 | SQLAlchemy async models + DB engine | Person A | May 29 | M0 | M2, M3, M4, M5, M7 | — | ✅ Done |
| M2 | JWT auth endpoints (register + login) | Person B | May 29 | M1 | M4, M7, M8 | — | ✅ Done |
| M3 | CoinGecko proxy + 60s TTL cache | Person C | May 29 | M0 | M5, M9 | **REST** | ✅ Done |
| M12 | Cloud accounts + env vars provisioned | Person A | May 29 | — | M13, M14 | — | ⬜ Pending |
| M4 | Watchlist CRUD endpoints | Person B | May 30 | M1, M2 | M5, M10 | — | ⬜ Pending |
| M5 | Scheduler + alert evaluator + RabbitMQ publish | Person A | May 30 | M1, M3, M4 | M6 | **Messaging** | ⬜ Pending |
| M6 | RabbitMQ worker + Resend email | Person C | May 30 | M12 | M11, M13 | **Pub/Sub** | ⬜ Pending |
| M7 | Alert rule CRUD + history endpoint | Person B | May 30 | M1, M2 | M11 | — | ⬜ Pending |
| M8 | Frontend scaffold + auth pages | Person C | May 31 | M2 | M9, M10, M11 | — | ⬜ Pending |
| M9 | Frontend dashboard (live prices) | Person A | May 31 | M8, M3 | M14 | — | ⬜ Pending |
| M10 | Frontend watchlist page | Person B | May 31 | M8, M4 | M14 | — | ⬜ Pending |
| M11 | Frontend alerts + history pages | Person C | May 31 | M8, M7 | M14 | — | ⬜ Pending |
| M13 | Deploy API + Worker to Render | Person A | June 1 | All backend + M12 | M14 | — | ⬜ Pending |
| M14 | Deploy frontend to Vercel + smoke test | Person B | June 1 | M13, M8–M11 | — | — | ⬜ Pending |

### Dependency Graph

```
M0 ──► M1 ──┬──► M2 ──┬──► M4 ──► M5 ──► M6
             │         └──► M7           ↑
             └──► M3 ──────────────────►─┘
M12 ──────────────────────────────────────► M13 ──► M14
M2 ──► M8 ──┬──► M9  ──► M14
             ├──► M10 ──► M14
             └──► M11 ──► M14
```

**Highest-risk milestone: M5** — combines APScheduler, async SQLAlchemy sessions, and aio-pika in one job. Write `test_publish.py` first to verify CloudAMQP connection in isolation before wiring into the scheduler.

---

## Local Dev Commands

```bash
# Postgres (keep running)
docker compose up -d

# Backend (from backend/)
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload         # http://localhost:8000
                                      # Swagger UI: http://localhost:8000/docs

# Worker (separate terminal, from backend/)
source venv/bin/activate
python -m worker.main

# Frontend (from frontend/)
npm install
npm run dev                           # http://localhost:5173
```

---

## Environment Variables

```bash
# backend/.env  (copy from .env.example and fill in)
DATABASE_URL=postgresql+asyncpg://cryptoalert:cryptoalert@localhost:5432/cryptoalert
RABBITMQ_URL=amqp://user:pass@host:5672/vhost   # CloudAMQP connection string
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=alerts@yourdomain.com
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
POLL_INTERVAL_SECONDS=120
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3

# frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## Data Model

```
User             id (UUID PK), email (unique), hashed_password, created_at
WatchlistItem    id, user_id → User, coin_id (CoinGecko ID), added_at
Alert            id, user_id → User, coin_id, coin_name, condition (enum), threshold, is_active, created_at
AlertHistory     id, alert_id → Alert, user_id → User, coin_id, coin_name, condition,
                 threshold, price_at_trigger, change_24h, triggered_at, email_sent
```

`Alert.condition` enum values: `price_above`, `price_below`, `change_above`, `change_below`

---

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account → 201 `{id, email}` |
| POST | `/auth/login` | Authenticate → `{access_token, token_type}` |

### Authenticated (Bearer JWT)
| Method | Path | Description |
|---|---|---|
| GET | `/coins/markets` | Top coins from CoinGecko (cached 60s); `?ids=bitcoin,ethereum` to filter |
| GET | `/watchlist` | User's watchlist |
| POST | `/watchlist` | Add coin `{coin_id}` |
| DELETE | `/watchlist/{coin_id}` | Remove coin |
| GET | `/alerts` | List all alert rules |
| POST | `/alerts` | Create rule `{coin_id, coin_name, condition, threshold}` |
| DELETE | `/alerts/{id}` | Delete rule |
| GET | `/alerts/history` | Triggered alerts, newest first; `?limit=50&offset=0` |

---

## Integration Techniques (grading-critical)

### 1. REST (`GET /coins/markets`)
- Backend is a REST client to CoinGecko (`httpx`)
- Frontend is a REST client to our API (`axios`)
- 60s TTL cache in `services/coingecko.py` prevents rate-limit hits

### 2. Messaging (`services/publisher.py`)
- Scheduler publishes to RabbitMQ when alert condition is met
- Exchange: `alerts_exchange` (direct), routing key: `alert.triggered`
- Message: `{alert_id, user_email, coin_id, coin_name, condition, threshold, triggered_price, change_24h, triggered_at}`
- **Always use `aio_pika.connect_robust()`** — CloudAMQP drops idle connections after 60s

### 3. Pub/Sub (`worker/main.py`)
- Worker subscribes to `price_alerts_queue`
- Sends email via Resend on each message
- Deployed as a separate Render Background Worker (independent process)

---

## Architecture Decisions

- **No Celery** — scheduler is an `asyncio` loop inside FastAPI `lifespan`
- **One-shot alerts** — deactivated on first trigger; user can re-enable

## Frontend Visual Identity

- Use the `frontend-design` skill for frontend implementation and restyling.
- CryptoAlert uses an Industrial identity: black surfaces, monospaced typography, flat 1px borders, tabular numerics, and no decorative shadows.
- The application palette is black plus money-green, inspired by Green Lantern energy without using branded copy or assets: primary green `#00e676`, strong green `#2dff8f`, background `#050806`, panel `#0b0f0c`, border `#193823`, text `#9fb4a7`, strong text `#f0fff5`.
- Keep this palette as the default for future frontend milestones M9-M11 unless the team explicitly changes the product identity.
- **Batch CoinGecko calls** — all monitored coins in one `/coins/markets` call; never one per coin
- **Worker is a separate process** — deployed independently on Render; no shared state with API
- **No WebSockets** — frontend polls endpoints; simpler scope
- **No Alembic** — `create_all()` on startup; only add Alembic if schema changes after initial setup
- **Docker only for local DB** — app runs directly; no app container

## Critical Implementation Rules

1. `aio_pika.connect_robust()` — never `connect()` (CloudAMQP 60s idle timeout)
2. Fresh `AsyncSession` inside each scheduler job — never reuse the outer FastAPI session
3. Always batch CoinGecko IDs in one call — never per-coin requests
4. DB write (deactivate alert + AlertHistory) before RabbitMQ publish — acceptable to publish after a failed write; unacceptable to send email with no history record
5. `GET /alerts/history` route must be declared before `GET /alerts/{id}` to avoid FastAPI path conflict

---

## Deploy Architecture

```
Vercel (frontend)
    └──► Render Web Service (FastAPI API)  ──► Render Postgres
                    │                      ──► CloudAMQP (publish)
                    │
         Render Background Worker          ──► CloudAMQP (consume)
                    └──► Resend (email)
```

### Render Deploy Config

**API service**
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Worker service**
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `python -m worker.main`

**Env vars on both**: `DATABASE_URL`, `RABBITMQ_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `JWT_SECRET`, `JWT_ALGORITHM`, `POLL_INTERVAL_SECONDS`, `COINGECKO_BASE_URL`

### Vercel Deploy Config
- Root Directory: `frontend/`
- Env var: `VITE_API_URL=https://<api>.onrender.com`

---

## CoinGecko Free API

Base URL: `https://api.coingecko.com/api/v3`

Key endpoint:
```
GET /coins/markets
  ?vs_currency=usd
  &order=market_cap_desc
  &per_page=100
  &ids=bitcoin,ethereum,...   (optional filter)
  &price_change_percentage=24h
```

Rate limit: ~10–30 req/min. No API key. On 429: back off 60s, return 503 to client.
