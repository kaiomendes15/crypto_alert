# M1 — Database Models + Async Engine

**Day**: May 29 | **Owner**: Person A | **Blocks**: M2, M3, M4, M5, M7 | **Blocked by**: M0

## Goal

Define all four SQLAlchemy async models and wire up the async engine so every subsequent milestone has a stable schema to build against.

## Acceptance Criteria

- [ ] `User`, `WatchlistItem`, `Alert`, `AlertHistory` tables created in local Postgres on app startup
- [ ] `AsyncSession` factory (`async_sessionmaker`) importable from `app/db/base.py`
- [ ] FK constraints: `WatchlistItem.user_id → User.id`, `Alert.user_id → User.id`, `AlertHistory.alert_id → Alert.id`, `AlertHistory.user_id → User.id`
- [ ] `Alert.condition` is a Python `Enum` with values: `price_above`, `price_below`, `change_above`, `change_below`
- [ ] `create_tables()` called in FastAPI `lifespan`

## Key Files

```
backend/app/db/
├── __init__.py
├── base.py       # engine, async_session, Base, create_tables()
└── models.py     # User, WatchlistItem, Alert, AlertHistory
```

## Models

```python
class User:          id, email (unique), hashed_password, created_at
class WatchlistItem: id, user_id (FK), coin_id, added_at
class Alert:         id, user_id (FK), coin_id, coin_name, condition (Enum), threshold, is_active, created_at
class AlertHistory:  id, alert_id (FK), user_id (FK), coin_id, coin_name, condition, threshold,
                     price_at_trigger, change_24h, triggered_at, email_sent
```
