# AGENTS.md — Entry point for AI coding agents (Codex, Claude Code, Antigravity)

Project: **LabLink** — campus lab resource-sharing platform with explainable AI conflict resolution.

## Session start (always)
1. Read `MEMORY.md` → **Current Status** and **Next 3 actions**.
2. Open the active phase in `PHASES.md` and do **only that phase**.
3. Read other docs **on demand** (don't load everything):

| Need | File |
|---|---|
| What to build, acceptance criteria, security/UX requirement IDs | `PRD.md` |
| Structure, data model, flows, algorithms, deployment | `ARCHITECTURE.md` |
| Do/don't, approved libraries, error handling, AI limits, conventions | `RULES.md` |
| Task order and exit criteria | `PHASES.md` |
| UI tokens, components, screens, a11y, microcopy | `DESIGN.md` |
| History, decisions, status | `MEMORY.md` |

## Priorities
Security (`SEC-*`) → core flow (discover → book → approve → AI-explained conflict resolution) → usability & accessibility → tests & code quality → everything else.

## Non-negotiables (details in `RULES.md`)
- Guest can browse/search/view availability without login; auth is requested just-in-time and the action resumes.
- Every API route uses `apiHandler`; every input validated with Zod; authorisation (role + ownership) enforced in services.
- Deterministic engine decides allocation; Gemini only explains/searches/drafts, always with a rule-based fallback; app runs with **no** API key and **no** `.env`.
- Booking writes are transactional and race-safe.
- Only allow-listed libraries. No secrets in repo. One git branch. Repo < 10 MB.
- Folder layout is `src/app`, `src/components`, `src/services`, `src/lib/{auth,booking,allocation,ai,db,security,validation,utils}`, `tests/`.

## Commands
```
npm install | npm run dev | npm run build | npm run start
npm run lint | npm run typecheck | npm test | npm run test:e2e
npm run seed | npm run verify   # lint + typecheck + test + build
```

## Checkpoint (end of every phase / milestone / session)
Run `npm run verify` → update `MEMORY.md` (Status, Phase Tracker, Done Log, Decisions, Issues, Next) → commit `chore(memory): checkpoint phase N`.
If stuck after 3 attempts: log it under Blockers in `MEMORY.md` and continue with the simplest safe option.
