# M8 — Frontend Scaffold + Auth Pages

**Day**: May 31 | **Owner**: Person C | **Blocks**: M9, M10, M11 | **Blocked by**: M2

## Goal

Vite + React 18 project wired to the API, with working Register and Login pages that store a JWT and redirect to the dashboard.

## Acceptance Criteria

- [ ] `npm run dev` serves the app on `localhost:5173`
- [ ] `/register` form POSTs to `POST /auth/register`; success → redirect to `/login`
- [ ] `/login` form POSTs to `POST /auth/login`; success → stores token in `localStorage`, redirects to `/dashboard`
- [ ] Invalid credentials show an inline error message (no `alert()` or `console.log`)
- [ ] Axios instance in `src/api.js` attaches `Authorization: Bearer <token>` on every request
- [ ] `<ProtectedRoute>` redirects to `/login` if no token in `localStorage`

## Key Files

```
frontend/src/
├── api.js                        # Axios instance with JWT interceptor
├── App.jsx                       # React Router — routes + ProtectedRoute
├── pages/
│   ├── Login.jsx
│   └── Register.jsx
└── components/
    └── ProtectedRoute.jsx
```

## Dependencies

```bash
npm install axios react-router-dom
```
