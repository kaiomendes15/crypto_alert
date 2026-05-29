# M2 — Auth Endpoints

**Day**: May 29 | **Owner**: Person B | **Blocks**: M4, M7, M8 | **Blocked by**: M1

## Goal

Working `POST /auth/register` and `POST /auth/login` returning a signed JWT, plus a `get_current_user` FastAPI dependency used by all protected routes.

## Acceptance Criteria

- [ ] `POST /auth/register` → 201 `{id, email}`; duplicate email → 409
- [ ] `POST /auth/login` → `{access_token, token_type: "bearer"}`; wrong password → 401
- [ ] `Authorization: Bearer <token>` on protected routes resolves to `User` ORM object via `get_current_user`
- [ ] Passwords hashed with `bcrypt`
- [ ] JWT signed with `JWT_SECRET` from config; `sub` claim holds `user.id` as string

## Key Files

```
backend/app/
├── core/
│   └── dependencies.py   # get_db, get_current_user
└── api/v1/routes/
    └── auth.py           # POST /auth/register, POST /auth/login
```

## Pydantic Schemas

```python
RegisterRequest: email, password
LoginRequest:    email, password
TokenResponse:   access_token, token_type="bearer"
```
