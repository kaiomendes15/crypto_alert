# M9 — Frontend Dashboard (Live Prices)

**Day**: May 31 | **Owner**: Person A | **Blocks**: M14 | **Blocked by**: M8, M3

## Goal

Dashboard page polls `GET /coins/markets` every 30 s and renders a live price table with green/red indicators.

## Acceptance Criteria

- [ ] Table shows: coin logo, name, symbol, current price (formatted as `$xx,xxx.xx`), 24h % change
- [ ] Price change cell is green for positive, red for negative (CSS classes, not inline style)
- [ ] Skeleton/loading state on first fetch — no blank flash
- [ ] Polling runs via `setInterval` inside `useEffect`; cleanup on unmount (no memory leak)
- [ ] At least 20 coins visible by default

## Key Files

```
frontend/src/pages/
└── Dashboard.jsx
```
