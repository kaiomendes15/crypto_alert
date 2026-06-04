# M15 — CoinGecko API Key (Demo Tier)

**Day**: June 3 | **Owner**: Person A | **Blocked by**: M3 | **Blocks**: —

## Goal

Autenticar as requisições à CoinGecko com a chave do plano Demo (`x-cg-demo-api-key`) para eliminar os 429s causados pela classificação do IP do Render como datacenter. A limitação passa a ser por chave, não por IP.

## Contexto

O Render hospeda a API em IPs de datacenter reconhecidos pela CoinGecko. Sem autenticação, o rate limit é aplicado por IP e se esgota rapidamente. Com a chave Demo (gratuita), o limite passa a ser por chave e é significativamente mais generoso. O endpoint base permanece o mesmo — apenas o header muda.

## Decisões de Design

- **Sem fallback**: a chave é obrigatória em produção; se ausente, as requisições seguem sem o header (comportamento atual)
- **Mesmo endpoint base**: plano Demo usa `api.coingecko.com/api/v3` — `COINGECKO_BASE_URL` não muda
- **Header, não query param**: CoinGecko recomenda `x-cg-demo-api-key` como header para o plano Demo

## Acceptance Criteria

- [x] `COINGECKO_API_KEY` adicionado em `Settings` como campo opcional (`str = ""`)
- [x] `coingecko.py` passa `x-cg-demo-api-key` no header do `httpx.AsyncClient` quando a variável está presente
- [x] `backend/.env.example` documenta a nova variável
- [x] Nenhum outro comportamento alterado (cache, TTL, normalização de IDs, tratamento de erro) — ver Cenários de Teste Manual
- [ ] `COINGECKO_API_KEY` configurado no Render (API service)
- [ ] Sem 429s em produção após o deploy

## Key Files

```
backend/
├── app/
│   ├── core/
│   │   └── config.py       # + coingecko_api_key: str = ""
│   └── services/
│       └── coingecko.py    # + header x-cg-demo-api-key quando key presente
└── .env.example            # + COINGECKO_API_KEY=
```

## CoinGecko Demo Plan

- Header: `x-cg-demo-api-key: <key>`
- Endpoint base: `https://api.coingecko.com/api/v3` (sem mudança)
- Rate limit: definido pela chave, não pelo IP

## Cenários de Teste Manual

Pré-requisitos: `docker compose up -d`, backend rodando (`uvicorn app.main:app --reload`),
e um JWT válido (registre/login via Swagger em `http://localhost:8000/docs` e autorize com o token).
Após cada mudança no `.env`, **reinicie o backend** — `Settings` lê o `.env` na inicialização.

| # | Cenário | Setup (`.env`) | Passos | Resultado esperado |
|---|---|---|---|---|
| 1 | Sem chave (fallback/legado) | `COINGECKO_API_KEY` ausente ou vazio | `GET /coins/markets` | 200 com lista de moedas — idêntico ao comportamento anterior; nenhum header de auth enviado |
| 2 | Header é transmitido (chave inválida) | `COINGECKO_API_KEY=chave-invalida-123` | `GET /coins/markets` | Erro propagado da CoinGecko (400/401 → 500/503). Prova que o header chegou e foi validado. Contraste com #1 (vazio → 200): a diferença confirma a transmissão |
| 3 | Chave Demo válida | `COINGECKO_API_KEY=<chave real>` | `GET /coins/markets` | 200; a requisição aparece contabilizada no dashboard da CoinGecko sob a chave |
| 4 | Inspeção visual do header (opcional) | `COINGECKO_API_KEY=<qualquer>` + `COINGECKO_BASE_URL=https://webhook.site/<seu-id>` | `GET /coins/markets` (backend vai falhar ao parsear, tudo bem) | No painel do webhook.site aparece o header `x-cg-demo-api-key`. **Reverter `COINGECKO_BASE_URL` depois** |
| 5 | Cache TTL inalterado | chave válida | `GET /coins/markets` duas vezes em < 60s | 2ª resposta rápida (cache hit); CoinGecko conta apenas 1 requisição |
| 6 | Filtro + normalização de IDs | chave válida | `GET /coins/markets?ids=ethereum,bitcoin` e depois `?ids=bitcoin,ethereum` | Mesmos dados, mesmo cache (IDs ordenados internamente) — apenas 1 chamada à CoinGecko |
| 7 | Funcionalidades dependentes (e2e) | chave válida | Abrir Dashboard e Watchlist no frontend; criar um alerta e aguardar o `POLL_INTERVAL_SECONDS` | Preços carregam; scheduler avalia o alerta (todos consomem `get_markets`) |

Observação sobre o 429 (cenário difícil de reproduzir localmente): sem chave, dispare requisições
variando `?ids=` para furar o cache até a CoinGecko responder 429 — a API deve devolver 503 ao cliente.
Esse é exatamente o sintoma que a chave elimina em produção.
