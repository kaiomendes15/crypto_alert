# M10 — Frontend Watchlist Page

**Day**: May 31 | **Owner**: Person B | **Blocks**: M14 | **Blocked by**: M8, M4

## Goal

Page where users search for coins and add/remove them from their watchlist.

## Acceptance Criteria

- [ ] Search input filters the full coin list (from `GET /coins/markets`) client-side — no extra API call per keystroke
- [ ] Coins already in watchlist show "Remove" button; others show "Add" button
- [ ] "Add" calls `POST /watchlist`; "Remove" calls `DELETE /watchlist/{coin_id}`
- [ ] UI updates immediately after add/remove (optimistic update or re-fetch)

## Key Files

```
frontend/src/pages/
└── Watchlist.jsx
```
