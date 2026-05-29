# M12 — Cloud Account Setup + Env Vars

**Day**: May 29 | **Owner**: Person A | **Blocks**: M13, M14 | **Blocked by**: nothing

## Goal

All four external services provisioned and credentials stored in `.env` locally, unblocking the deploy milestones.

## Acceptance Criteria

- [ ] **CloudAMQP** — "Little Lemur" free instance created → `RABBITMQ_URL` in `.env`
- [ ] **Render Postgres** — free DB created → `DATABASE_URL` (asyncpg format) in `.env`
- [ ] **Resend** — account created, sending domain verified, API key → `RESEND_API_KEY` + `RESEND_FROM_EMAIL` in `.env`
- [ ] **Vercel** — project created, linked to repo, Root Directory set to `frontend/`
- [ ] `.env.example` committed listing all required keys (no values)

## Services to Provision

| Service | Free plan | What you need |
|---|---|---|
| CloudAMQP | Little Lemur | AMQP URL (copy from dashboard) |
| Render | Free Postgres | Internal DB URL (copy from dashboard) |
| Resend | Free tier | API key + verified sender domain |
| Vercel | Hobby | GitHub integration |

## Notes

- Render's free Postgres URL uses `postgresql://` — change to `postgresql+asyncpg://` for SQLAlchemy
- Resend requires a verified domain to send email; use a shared team email domain or a free subdomain
