# M11 — Frontend Alerts + History Pages

**Day**: May 31 | **Owner**: Person C | **Blocks**: M14 | **Blocked by**: M8, M7

## Goal

Alerts management page (create/delete rules) and triggered-alert history page.

## Acceptance Criteria

- [ ] Alerts page: form with coin selector (from watchlist), condition dropdown, threshold input; "Create Alert" calls `POST /alerts`
- [ ] Alert list below the form; each row has a "Delete" button calling `DELETE /alerts/{id}`
- [ ] History page: table of triggered alerts — coin, condition, threshold, triggered price, date
- [ ] History auto-refreshes every 30 s
- [ ] Empty states shown when no alerts or no history exist

## Key Files

```
frontend/src/pages/
├── Alerts.jsx
└── History.jsx
```
