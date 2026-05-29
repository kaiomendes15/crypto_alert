# M3 — CoinGecko Proxy + TTL Cache

**Day**: May 29 | **Owner**: Person C | **Blocks**: M5, M9 | **Blocked by**: M0

## Goal

`GET /coins/markets` proxies CoinGecko and caches the result for 60 seconds so repeated calls (from the frontend and from the scheduler) don't exceed the free-tier rate limit.

**Integration Technique 1 — REST**: the backend acts as a REST client to CoinGecko; the frontend acts as a REST client to our API.

## Acceptance Criteria

- [ ] `GET /coins/markets` returns `[{id, symbol, name, current_price, price_change_percentage_24h, image}]`
- [ ] Optional `?ids=bitcoin,ethereum` filters by coin IDs
- [ ] Module-level `dict` + `datetime` TTL cache prevents duplicate CoinGecko calls within 60 s
- [ ] CoinGecko 429 → our API returns 503 with `"retry in 60s"` message
- [ ] Endpoint visible in Swagger UI; cache-hit response time < 200 ms

## Key Files

```
backend/app/
├── services/
│   └── coingecko.py        # get_markets(ids?) — httpx client + TTL cache
└── api/v1/routes/
    └── coins.py            # GET /coins/markets
```

## CoinGecko Call

```
GET /coins/markets
  ?vs_currency=usd
  &order=market_cap_desc
  &per_page=100
  &ids=bitcoin,ethereum,...   (optional)
  &price_change_percentage=24h
```

No API key required. Always batch — never one request per coin.
