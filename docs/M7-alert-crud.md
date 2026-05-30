# M7 — Alert Rule CRUD + History Endpoint

**Day**: May 30 | **Owner**: Person B | **Blocks**: M11 | **Blocked by**: M1, M2

## Goal

Authenticated endpoints to create and manage alert rules, and to retrieve the history of triggered alerts.

## Acceptance Criteria

- [x] `POST /alerts {coin_id, coin_name, condition, threshold}` → 201; validates `condition` is a known enum value
- [x] `GET /alerts` → list of all alerts for the user (active + inactive)
- [x] `DELETE /alerts/{id}` → 204; 404 if not found or not owned by current user
- [x] `GET /alerts/history` → paginated list of `AlertHistory` rows, newest first; supports `?limit=50&offset=0`

## Key Files

```
backend/app/api/v1/routes/
└── alerts.py    # POST /alerts, GET /alerts, DELETE /alerts/{id}, GET /alerts/history
```

## Pydantic Schemas

```python
AlertCreate: coin_id, coin_name, condition (AlertCondition enum), threshold (float)
```

## Notes

- `condition` must be validated against the `AlertCondition` enum (`price_above`, `price_below`, `change_above`, `change_below`)
- `GET /alerts/history` must be declared **before** any route with `{id}` path param to avoid FastAPI routing conflicts
