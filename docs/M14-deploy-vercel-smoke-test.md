# M14 — Deploy Frontend to Vercel + End-to-End Smoke Test

**Day**: June 1 | **Owner**: Person B | **Blocks**: nothing (final deliverable) | **Blocked by**: M13, M8–M11

## Goal

Frontend is live on Vercel pointing at the Render API, and a full user journey works in production demonstrating all three integration techniques.

## Acceptance Criteria

- [ ] `https://<project>.vercel.app` loads without console errors
- [ ] Full user journey on live URLs: register → login → add coin to watchlist → create alert → wait for trigger → email received
- [ ] All three integration points demonstrable from the live URL:
  - REST: dashboard shows live CoinGecko prices
  - Messaging: alert rule triggers and message appears in CloudAMQP dashboard
  - Pub/Sub: email arrives in inbox

## Vercel Deploy Steps

1. In Vercel project settings: set **Root Directory** to `frontend/`
2. Set env var: `VITE_API_URL=https://<api>.onrender.com`
3. Trigger deploy; confirm build succeeds with no errors
4. Open the live URL and run the smoke test above

## Smoke Test Script (manual)

```
1. Open https://<project>.vercel.app
2. Register a new account
3. Login
4. Go to Dashboard — confirm prices load
5. Go to Watchlist — add Bitcoin
6. Go to Alerts — create alert: Bitcoin, price_below, threshold = 999999999 (always true)
7. Wait up to 120s for scheduler to run
8. Check History page — alert should appear
9. Check email inbox — email should arrive
10. Check CloudAMQP dashboard — queue message consumed
```
