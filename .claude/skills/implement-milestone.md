# implement-milestone

Implement a project milestone end-to-end.

## Usage

```
/implement-milestone <id>
```

Examples: `/implement-milestone M1`, `/implement-milestone 3`, `/implement-milestone M5`

## Instructions

Follow these steps in order. Do not skip steps.

### Step 1 — Identify the milestone

The argument passed to this skill is the milestone identifier. Accept any of:
- Numeric ID: `1`, `M1`, `milestone 1`
- Slug words: `database models`, `auth endpoints`, `coingecko proxy`, etc.

### Step 2 — Locate and read the milestone doc

Search `docs/` for `docs/M<N>-*.md` matching the identifier. Read the matched file in full before doing anything else.

### Step 3 — Read supporting context

Read these files before writing any code:

1. `.claude/CLAUDE.md` — stack, architecture decisions, critical implementation rules, data model, API contract
2. Any existing source files listed in the **Key Files** section of the milestone doc — read them to avoid overwriting work

Also skim the docs of milestones listed as **Blocked by** in the doc header, to understand what already exists and must not be re-implemented.

### Step 4 — Check existing work

Before creating any file:
- Use `find` or `ls` to check what already exists at the paths listed in **Key Files**
- Read any pre-existing files at those paths — they may be partial implementations
- Note which acceptance criteria are already satisfied

### Step 5 — Implement

Map each acceptance criterion to a concrete file change, then implement. For each file:

1. Create or edit only the file
2. Verify it satisfies the acceptance criteria it targets
3. If a file already existed, change only what is needed — do not rewrite unrelated parts

Follow every rule in the **Critical Implementation Rules** section of CLAUDE.md. Follow every **Architecture Decision** — do not introduce alternatives not listed there.

### Step 6 — Wire up

If the milestone doc says a function should be called somewhere (e.g. `create_tables()` in `lifespan`), make that wiring change now. Do not leave functions defined but unused.

### Step 7 — Verify

Run the project to confirm the milestone works. Watch startup logs and, if the milestone adds HTTP endpoints, test them via the Swagger UI at `http://localhost:8000/docs` or curl. Fix any startup errors before proceeding.

### Step 8 — Mark done

- In `docs/M<N>-*.md`: change `- [ ]` to `- [x]` for every passing acceptance criterion.
- In `.claude/CLAUDE.md`: change `⬜ Pending` to `✅ Done` for this milestone row.

### Step 9 — Report

State which files were created or modified, which acceptance criteria passed, and any criteria that could not be verified locally (e.g. require cloud credentials).
