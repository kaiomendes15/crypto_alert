# CryptoAlert

[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg)](https://www.postgresql.org)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-CloudAMQP-FF6600.svg)](https://www.cloudamqp.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev)
[![Deploy](https://img.shields.io/badge/Deploy-Render%20%2B%20Vercel-46E3B7.svg)](https://render.com)

Sistema web de monitoramento e alertas de preço para criptomoedas, desenvolvido como projeto da disciplina **Técnicas de Integração de Sistemas — AV3** da Universidade de Fortaleza (UNIFOR).

**Integrantes:** Leonardo Meneses Cavalcante · Kaio Damasceno Mendes · Saulo Borges de Sena

---

## Descrição do Projeto

O CryptoAlert permite que usuários autenticados montem uma lista de acompanhamento (_watchlist_) com os ativos de seu interesse, definam regras de alerta baseadas em condições de preço ou variação percentual em 24 horas, e recebam notificações por e-mail automaticamente no momento em que uma condição é atingida.

O mercado de criptomoedas opera 24 horas por dia, 7 dias por semana, com variações de preço que podem ser expressivas em questão de minutos. Monitorar manualmente dezenas de ativos é inviável. O sistema propõe uma solução automatizada que demonstra, na prática, os três padrões de integração exigidos pela disciplina: REST, Mensageria Assíncrona e Pub/Sub.

---

## Arquitetura

A solução é composta por quatro camadas principais. O **Frontend React** representa a interface com o usuário. O **Backend FastAPI** atua como núcleo de integração e orquestração. O **Worker RabbitMQ** é um processo consumidor independente de eventos. Os **Serviços Externos** (CoinGecko e Brevo) completam o fluxo de dados e notificações.

```
┌──────────────────────────────────────────────────────────────┐
│  Vercel — React 18 + Vite                                    │
│  Dashboard · Watchlist · Alerts · History                    │
└───────────────────────┬──────────────────────────────────────┘
                        │ REST / Axios (Bearer JWT)
┌───────────────────────▼──────────────────────────────────────┐
│  Render Web Service — FastAPI                                │
│                                                              │
│  ┌─────────────────┐   ┌─────────────────────────────────┐  │
│  │  APScheduler    │──►│  GET /coins/markets             │  │
│  │  (a cada 30s)   │   │  CoinGecko REST (cache 60s)     │  │
│  │                 │   └─────────────────────────────────┘  │
│  │  Avalia alertas │──► PostgreSQL (AlertHistory + flag)    │
│  │  ativos         │                                        │
│  │                 │──► CloudAMQP (AMQP publish)  ──────┐  │
│  └─────────────────┘                                    │  │
└─────────────────────────────────────────────────────────│──┘
                                                          │ AMQP
┌─────────────────────────────────────────────────────────▼──┐
│  Render Background Worker — Python standalone              │
│  Consome fila → envia e-mail via Brevo                     │
└────────────────────────────────────────────────────────────┘
```

### Topologia RabbitMQ

O desacoplamento entre o backend e o envio de e-mail é garantido por uma topologia direta no RabbitMQ: o backend publica na exchange `alerts_exchange` (direct, durable) com a routing key `alert.triggered`, e a fila `price_alerts_queue` (durable) entrega as mensagens ao worker consumidor.

---

## Fluxo Principal de Dados

O usuário acessa o frontend e realiza cadastro ou login. O backend valida as credenciais, retorna um JWT assinado, e o frontend o armazena no `localStorage` redirecionando ao dashboard. A partir desse momento, o dashboard faz polling em `GET /coins/markets` a cada 30 segundos, exibindo preços e variação de 24h em tempo real.

Quando o usuário adiciona moedas à watchlist e cria regras de alerta, essas configurações são persistidas no PostgreSQL. O scheduler interno avalia todas as regras ativas a cada ciclo de 30 segundos: busca todos os `coin_id` distintos da watchlist em uma única query, faz uma única chamada ao CoinGecko para todos esses ativos simultaneamente, e avalia cada alerta ativo com `SELECT ... FOR UPDATE` para evitar avaliação duplicada em cenários de concorrência. Quando uma condição é satisfeita, o alerta é desativado, um registro de `AlertHistory` é inserido e a transação é comitada — somente após o commit a mensagem é publicada na fila, garantindo que nunca haverá e-mail enviado sem histórico registrado.

O worker consome a mensagem, constrói o e-mail HTML com os detalhes do ativo no momento do disparo, envia via Brevo e então confirma (`ack`) a mensagem ao broker. Em caso de falha no envio, a mensagem é descartada para evitar spam.

---

## Técnicas de Integração

### REST — Proxy CoinGecko

A integração com o CoinGecko representa dois níveis de REST encadeados. O backend atua como cliente REST para a API externa via `httpx`, e o frontend atua como cliente REST para o backend via Axios. O endpoint `GET /coins/markets` consulta o CoinGecko com os parâmetros `vs_currency=usd`, `order=market_cap_desc`, `per_page=100` e `price_change_percentage=24h`. Um cache em memória de 60 segundos evita chamadas repetidas e protege contra rate limit. Em caso de status 429, o backend retorna 503 com mensagem de retry. No frontend, o polling é implementado com `setInterval` dentro de `useEffect`, com limpeza adequada no desmonte do componente.

### Mensageria Assíncrona — Scheduler + RabbitMQ

O `APScheduler` com `AsyncIOScheduler` executa o job `check_prices` a cada 30 segundos dentro do ciclo de vida (`lifespan`) do FastAPI. O publisher utiliza `aio_pika.connect_robust()` — nunca `connect()` —, garantindo reconexão automática diante do timeout de idle de 60 segundos do CloudAMQP. A mensagem publicada contém todos os dados necessários para o envio do e-mail: `alert_id`, `user_email`, `coin_id`, `coin_name`, `condition`, `threshold`, `triggered_price`, `change_24h` e `triggered_at`.

### Pub/Sub — Worker de E-mail

O worker é um processo Python completamente independente: ele não conhece quem publicou a mensagem, apenas reage a eventos da fila. Conecta ao RabbitMQ via `connect_robust`, declara exchange e fila, e consome mensagens com `prefetch_count=10` para paralelismo controlado. Após o envio bem-sucedido do e-mail, atualiza o campo `email_sent` no `AlertHistory` como operação de melhor esforço — a falha nessa atualização é apenas logada, pois o e-mail já foi entregue e não deve ser reenviado.

---

## Stack de Tecnologias

| Camada | Tecnologia | Finalidade |
|--------|-----------|------------|
| Backend | Python 3.12 + FastAPI | API REST, regras de negócio, proxy CoinGecko |
| Backend | SQLAlchemy async + asyncpg | ORM assíncrono para PostgreSQL |
| Backend | PostgreSQL 16 | Persistência de usuários, watchlist, alertas e histórico |
| Backend | APScheduler | Job periódico de avaliação de alertas (30s) |
| Backend | aio-pika | Cliente AMQP assíncrono para publicação no RabbitMQ |
| Backend | httpx | Cliente HTTP assíncrono para consumo da API CoinGecko |
| Backend | pyjwt + bcrypt | Geração e validação de tokens JWT; hash de senhas |
| Worker | Python standalone + aio-pika | Consumidor da fila RabbitMQ |
| Worker | Brevo API / SMTP | Envio de e-mails transacionais com template HTML |
| Frontend | React 18 + Vite | Interface web com build otimizado |
| Frontend | React Router v7 | Navegação SPA com rotas protegidas por JWT |
| Frontend | Axios | Cliente HTTP com interceptor de token Bearer |
| Externo | CoinGecko API | Dados de mercado: preço, variação 24h |
| Mensageria | RabbitMQ via CloudAMQP | Broker para desacoplamento do envio de e-mail |
| Deploy | Render (Web + Worker + DB) | Hospedagem da API, worker e banco de dados |
| Deploy | Vercel | Hospedagem do frontend React |

---

## Modelo de Dados

```
User           id (UUID PK), email, hashed_password, created_at
WatchlistItem  id, user_id → User, coin_id, added_at
Alert          id, user_id → User, coin_id, coin_name,
               condition, threshold, is_active, created_at
AlertHistory   id, alert_id → Alert, user_id → User, coin_id, coin_name,
               condition, threshold, price_at_trigger, change_24h,
               triggered_at, email_sent
```

`Alert.condition` aceita quatro valores: `price_above`, `price_below`, `change_above`, `change_below`.

---

## Endpoints da API

### Públicos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/auth/register` | Cria conta com e-mail e senha — `201 {id, email}` / `409` e-mail duplicado |
| `POST` | `/auth/login` | Autentica e retorna token — `200 {access_token, token_type}` / `401` credenciais inválidas |

### Autenticados (Bearer JWT)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/coins/markets` | Top 100 moedas do CoinGecko (cache 60s); `?ids=` para filtrar |
| `GET` | `/watchlist` | Lista watchlist do usuário autenticado |
| `POST` | `/watchlist` | Adiciona moeda `{coin_id}` — `201` / `409` duplicado |
| `DELETE` | `/watchlist/{coin_id}` | Remove moeda — `204` / `404` não encontrado |
| `GET` | `/alerts` | Lista todas as regras do usuário (ativas e inativas) |
| `POST` | `/alerts` | Cria regra `{coin_id, coin_name, condition, threshold}` |
| `DELETE` | `/alerts/{id}` | Remove regra — `204` / `404` não encontrado |
| `GET` | `/alerts/history` | Histórico paginado de alertas disparados; `?limit=50&offset=0` |
| `GET` | `/health` | Health check — `200 {status: ok}` |

---

## Estrutura do Projeto

```
crypto_alert/
├── docker-compose.yml          # PostgreSQL 16 para desenvolvimento local
├── render.yaml                 # Blueprint de deploy para Render
├── docs/                       # Documentação de cada milestone (M0–M15)
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + lifespan (scheduler inicia aqui)
│   │   ├── core/
│   │   │   ├── config.py       # Settings via pydantic-settings
│   │   │   ├── dependencies.py # get_db, get_current_user
│   │   │   └── messaging.py    # Constantes de exchange, queue e routing key
│   │   ├── db/
│   │   │   ├── base.py         # Engine, async_session, Base, create_tables()
│   │   │   └── models.py       # User, WatchlistItem, Alert, AlertHistory
│   │   ├── api/v1/routes/
│   │   │   ├── auth.py
│   │   │   ├── coins.py
│   │   │   ├── watchlist.py
│   │   │   └── alerts.py
│   │   └── services/
│   │       ├── coingecko.py    # httpx client + cache 60s
│   │       ├── scheduler.py    # APScheduler — avaliação de preços
│   │       └── publisher.py    # aio-pika publish
│   ├── worker/
│   │   └── main.py             # Consumidor RabbitMQ + envio via Brevo
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api.js              # Axios com interceptor JWT
    │   ├── App.jsx             # React Router + ProtectedRoute
    │   └── pages/
    │       ├── Dashboard.jsx   # Preços ao vivo, polling 30s
    │       ├── Watchlist.jsx
    │       ├── Alerts.jsx
    │       └── History.jsx
    ├── .env.example
    └── package.json
```

---

## Rodando Localmente

### Pré-requisitos

- Docker (para o PostgreSQL local)
- Python 3.12
- Node.js 18+
- Conta no [CloudAMQP](https://www.cloudamqp.com) (plano gratuito funciona)
- Conta no [Brevo](https://www.brevo.com) para envio de e-mail

### 1. Banco de dados

```bash
docker compose up -d
```

O PostgreSQL fica acessível em `localhost:5433`.

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # preencha as variáveis de ambiente
uvicorn app.main:app --reload
```

API disponível em `http://localhost:8000`. Swagger UI em `http://localhost:8000/docs`.

### 3. Worker (terminal separado)

```bash
cd backend
source venv/bin/activate
python -m worker.main
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # defina VITE_API_URL=http://localhost:8000
npm run dev
```

Frontend disponível em `http://localhost:5173`.

---

## Variáveis de Ambiente

### `backend/.env`

```env
DATABASE_URL=postgresql+asyncpg://cryptoalert:cryptoalert@localhost:5433/cryptoalert
RABBITMQ_URL=amqps://user:pass@host.cloudamqp.com/vhost

# E-mail — escolha o provider
EMAIL_PROVIDER=brevo_api          # ou brevo_smtp
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=alerts@seudominio.com
BREVO_FROM_NAME=CryptoAlert

# Auth
JWT_SECRET=troque-em-producao-minimo-32-chars
JWT_ALGORITHM=HS256

# Scheduler
POLL_INTERVAL_SECONDS=30

# CoinGecko
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=       # chave Demo elimina 429s no Render (opcional localmente)
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

> **Nota sobre o CoinGecko:** sem chave, o rate limit é por IP — problemático nos IPs de datacenter do Render. Uma chave Demo gratuita move o limite para a chave, eliminando os erros 429 em produção.

---

## Deploy

O arquivo `render.yaml` na raiz do repositório é um Blueprint que provisiona os três serviços Render (Web Service, Background Worker e PostgreSQL) em um único clique.

```
Vercel (frontend React)
    └──► Render Web Service (FastAPI)  ──► Render PostgreSQL
                   │                   ──► CloudAMQP (publish)
                   │
        Render Background Worker       ──► CloudAMQP (consume)
                   └──► Brevo (e-mail)
```

As variáveis `RABBITMQ_URL`, `JWT_SECRET`, `BREVO_API_KEY` e `BREVO_FROM_EMAIL` estão marcadas como `sync: false` no `render.yaml` e devem ser configuradas manualmente no dashboard do Render antes do primeiro deploy. No Vercel, defina `VITE_API_URL` apontando para a URL do Web Service do Render.
