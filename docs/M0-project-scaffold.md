# M0 — Project Scaffold

**Day**: May 29 | **Owner**: Person A | **Blocks**: M1, M2, M3 | **Blocked by**: nothing

## Goal

Create the full folder structure, install tooling, wire up FastAPI app skeleton, Docker Compose for local Postgres, and all config files so the rest of the team can start immediately without setup friction.

## Acceptance Criteria

- [x] `docker-compose.yml` at repo root starts Postgres 16 on port 5432 with `cryptoalert` user/db/pass
- [x] `backend/app/main.py` — FastAPI app with `/health` route returning `{"status": "ok"}`
- [x] `backend/app/core/config.py` — pydantic-settings `Settings` class loading all env vars
- [x] `backend/requirements.txt` — all dependencies listed
- [x] `backend/.env.example` — all required keys listed (no values)
- [x] `frontend/` initialized with Vite React template; `npm install` passes
- [x] `uvicorn app.main:app --reload` starts without errors
- [x] `.env` created locally from `.env.example` (not committed)
- [x] `README.md` documents `docker compose up -d`, backend, and frontend start commands

## Key Files

```
crypto_alert/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── core/
│   │       ├── __init__.py
│   │       └── config.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── package.json
    └── .env.example
```

## Env Vars (defined here, used in all subsequent milestones)

```bash
DATABASE_URL=postgresql+asyncpg://cryptoalert:cryptoalert@localhost:5432/cryptoalert
RABBITMQ_URL=amqp://user:pass@host:5672/vhost
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=your-verified-sender@example.com
BREVO_FROM_NAME=CryptoAlert
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
POLL_INTERVAL_SECONDS=120
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
```
