# CryptoAlert

Real-time cryptocurrency price alert system. Users build a watchlist, set price/variation conditions, and receive email notifications when conditions are met.

## Quick Start

### 1. Database (keep running)
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your values
uvicorn app.main:app --reload
```
API runs on http://localhost:8000 — Swagger UI at http://localhost:8000/docs

### 3. Worker (separate terminal)
```bash
cd backend
source venv/bin/activate
python -m worker.main
```

### 4. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Frontend runs on http://localhost:5173

## Stack
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy async + PostgreSQL 16
- **Queue**: RabbitMQ via CloudAMQP + aio-pika
- **Email**: Resend
- **Frontend**: React 18 (Vite) + React Router + Axios
- **Deploy**: Render (API + Worker + DB) · Vercel (frontend) · CloudAMQP

## Integration Techniques
1. **REST**: Backend proxies CoinGecko API; frontend consumes our REST API
2. **Messaging**: Scheduler publishes triggered alerts to RabbitMQ queue
3. **Pub/Sub**: Worker subscribes to queue and delivers email via Resend
