# M4 — Watchlist CRUD Endpoints

**Day**: May 30 | **Owner**: Person B | **Blocks**: M5, M10 | **Blocked by**: M1, M2

## Goal

Authenticated endpoints to manage a user's coin watchlist. The scheduler (M5) queries this table to know which coins to monitor.

## Acceptance Criteria

- [ ] `GET /watchlist` → list of `{id, coin_id, added_at}` for the authenticated user only
- [ ] `POST /watchlist {coin_id}` → 201; duplicate coin_id → 409
- [ ] `DELETE /watchlist/{coin_id}` → 204; coin not in list → 404
- [ ] All endpoints require JWT; unauthenticated → 401

## Key Files

```
backend/app/api/v1/routes/
└── watchlist.py    # GET /watchlist, POST /watchlist, DELETE /watchlist/{coin_id}
```

## Notes

- `coin_id` is the CoinGecko ID string (e.g. `"bitcoin"`, `"ethereum"`)
- No price data returned here — prices come from `GET /coins/markets`
