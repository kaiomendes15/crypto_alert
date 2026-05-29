---
name: arch-review
description: Review implemented milestones for SOLID, GRASP, design patterns, code quality, scalability, and conformance to feature documentation.
---

# arch-review

Deep architectural and quality review of all implemented milestones.

## Usage

```
/arch-review
```

No arguments required. The command auto-discovers implemented milestones and their source files.

## Instructions

Follow every step in order. Do not skip steps.

---

### Step 1 — Load project context

Read `.claude/CLAUDE.md` in full. This gives you the stack, architecture decisions, critical rules, data model, API contract, and integration techniques. Keep this context active for all subsequent steps.

---

### Step 2 — Discover implemented milestones

Parse the Milestones table in `.claude/CLAUDE.md`. Collect every row whose **Status** column is `✅ Done`. For each done milestone, note its ID (M0, M1, …) and goal.

If no milestones are done, output: "No implemented milestones found." and stop.

---

### Step 3 — Read milestone docs

For each implemented milestone ID, read `docs/M<N>-*.md`. Extract:
- **Goal** and **Acceptance Criteria**
- **Key Files** listed in the doc
- Any explicit design constraints or rules stated in the doc

---

### Step 4 — Read all implemented source files

Find and read every source file under `backend/` and `frontend/` that belongs to the implemented milestones. Use the Key Files lists from Step 3 as your primary guide, then also scan:

```
backend/app/core/
backend/app/db/
backend/app/api/
backend/app/services/
backend/worker/
frontend/src/
```

Read each file fully before forming any judgement. Do not review files you have not read.

---

### Step 5 — Read feature documentation

Check whether `docs/feature.md` exists.
- If it exists: read it in full. Note every feature, behaviour, and constraint it specifies.
- If it does not exist: note this and skip the feature-conformance section of the report (Step 7c).

---

### Step 6 — Analyse the code

Evaluate the code across these five lenses. For each finding, record:
- **File** and **line range** (e.g. `backend/app/services/coingecko.py:12-35`)
- **Severity**: `critical` | `major` | `minor` | `suggestion`
- **Description**: what the problem is and why it matters
- **Recommendation**: the specific change needed

#### 6a — SOLID principles

| Principle | What to look for |
|---|---|
| Single Responsibility | Classes/modules doing more than one job; route handlers mixing business logic with HTTP concerns |
| Open/Closed | Hard-coded branching that would require edits to add new alert conditions or coin sources |
| Liskov Substitution | Subtype contracts broken (less relevant for this stack but check if present) |
| Interface Segregation | Dependencies injected that expose more surface than the caller uses |
| Dependency Inversion | High-level modules importing low-level concretions directly; missing abstraction layers |

#### 6b — GRASP patterns

| Pattern | What to look for |
|---|---|
| Information Expert | Logic placed far from the data it operates on (e.g. alert condition evaluation scattered across layers) |
| Creator | Objects created in the wrong layer (e.g. ORM models instantiated inside route handlers with no service layer) |
| Controller | Route handlers doing work that belongs in a service or domain object |
| Low Coupling | Tight cross-module imports; circular dependencies |
| High Cohesion | Modules with unrelated responsibilities grouped together |
| Polymorphism | Repeated `if condition == "price_above" / elif condition == "price_below"` instead of dispatch |
| Pure Fabrication | Utility classes that don't map to domain concepts but are justified by cohesion |
| Indirection | Missing adapter/anti-corruption layers between external APIs (CoinGecko) and domain code |
| Protected Variations | Code that would break silently on CoinGecko schema changes; no defensive parsing |

#### 6c — Design patterns

Check for appropriate or missing use of:
- **Repository pattern** — is DB access abstracted from business logic, or are raw `select()` statements spread across route handlers?
- **Service layer** — is there a clear service layer between routes and the DB/external APIs?
- **Strategy pattern** — alert condition evaluation (`price_above`, `price_below`, `change_above`, `change_below`) is a natural fit; is it handled by a strategy or by long if/elif chains?
- **Factory / Builder** — JWT creation, password hashing, alert message construction
- **Facade** — does `coingecko.py` adequately hide the HTTP/cache complexity from callers?
- **Observer / Event** — RabbitMQ publish as an event notification; is the coupling appropriate?
- **Template Method** — repeated async patterns that could be extracted

#### 6d — Code quality and scalability

- **Async correctness**: blocking calls inside `async def`; missing `await`; improper session reuse across coroutines
- **Error handling**: bare `except`; swallowed exceptions; errors that leak internal details to clients
- **Security**: secrets in code; SQL injection surface; JWT validation gaps; bcrypt cost factor
- **Scalability**: module-level mutable cache state (thread-safety under multiple workers); `create_all()` on every startup under concurrent Render instances; N+1 query patterns
- **Testability**: hard-coded dependencies that cannot be injected or mocked
- **Type safety**: missing type annotations on public functions; untyped `dict` returns from service layer
- **Naming and consistency**: inconsistent naming conventions; misleading variable names

#### 6e — Critical implementation rule compliance

Cross-check every rule listed in the **Critical Implementation Rules** section of `CLAUDE.md`:
1. `aio_pika.connect_robust()` — verify it is (or will be) used, not `connect()`
2. Fresh `AsyncSession` per scheduler job — verify sessions are not reused
3. Batch CoinGecko calls — verify no per-coin requests anywhere
4. DB write before RabbitMQ publish — verify ordering in scheduler
5. Route declaration order (`/alerts/history` before `/alerts/{id}`) — verify in routes

Flag any violation as **critical**.

---

### Step 7 — Produce the report

Output a structured report with these sections. Use markdown. Be specific — cite file paths and line numbers for every finding. Do not output vague advice.

#### 7a — Summary

One-paragraph overview of the overall quality, what was done well, and the top concern.

#### 7b — Findings by severity

List all findings grouped by severity (`critical` → `major` → `minor` → `suggestion`). Each finding:

```
**[SEVERITY] Short title**
File: `path/to/file.py:line-line`
Problem: ...
Recommendation: ...
```

#### 7c — Feature conformance (skip if docs/feature.md absent)

For each feature or behaviour specified in `docs/feature.md`, state:
- ✅ Implemented correctly
- ⚠️ Partially implemented — what is missing
- ❌ Not implemented or implemented incorrectly

#### 7d — Pattern scorecard

One-line verdict per principle/pattern reviewed:

| Area | Assessment |
|---|---|
| SRP | … |
| OCP | … |
| LSP | … |
| ISP | … |
| DIP | … |
| Information Expert | … |
| Creator | … |
| Controller | … |
| Low Coupling | … |
| High Cohesion | … |
| Repository pattern | … |
| Service layer | … |
| Strategy pattern | … |
| Async correctness | … |
| Scalability | … |
| Critical rule compliance | … |

#### 7e — Prioritised refactor list

A numbered list of the highest-value changes to make, ordered by impact. For each:
- What to change
- Why (business or technical consequence of not changing it)
- Rough effort: `small` | `medium` | `large`
