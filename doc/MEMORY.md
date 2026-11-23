# MEMORY.md — Living project memory

> **Purpose:** single source of truth for *what happened, what is happening, what's next*. Any agent can resume from this file alone.
> **Rules:** Read the **Current Status** first at every session start. **Update at every checkpoint** (end of each phase, any milestone > ~45 min, any decision/deviation, and before ending a session). Overwrite *Current Status*; **append** to *Done Log*, *Decisions*, *Issues*. Keep this file under ~300 lines — compact old Done Log rows into one-liners when it grows.

---

## 1. Current Status  _(overwrite each checkpoint)_
| Field | Value |
|---|---|
| Last updated | 2026-11-23 (planning) |
| Project stage | **Planning complete — no code written yet** |
| Active phase | — (next: **Phase 0 — Scaffold & tooling**) |
| Last checkpoint | Docs created: PRD, ARCHITECTURE, RULES, PHASES, DESIGN, MEMORY, AGENTS/CLAUDE/GEMINI |
| Last `npm run verify` | n/a (no code yet) |
| Last `npm run test:e2e` | n/a |
| Live URL | not deployed |
| Repo | not created yet (must be public, one branch, `.git` URL, < 10 MB) |
| Attempts used (submission) | 0 / 2 |
| Blockers | none |

**What is happening now:** waiting to start Phase 0.
**Next 3 actions:**
1. Phase 0: scaffold Next.js (TS strict, Tailwind, ESLint boundaries, Vitest, Playwright, Dockerfile, config/errors/logger, `/api/health`).
2. Phase 1: SQLite schema + migrations + `apiHandler` security pipeline + middleware (CSP).
3. Phase 2: seed data including the demo conflict scenario.

---

## 2. Project Snapshot
- **Product:** LabLink — GenAI-powered campus lab resource-sharing platform (discover → book → project-based request → faculty approval → AI-explained conflict resolution).
- **Event constraints:** public GitHub repo (`.git` URL, 1 branch, < 10 MB) · live Cloud Run URL · LinkedIn post · 2 scored attempts, **latest counts** · scored on code quality, security, efficiency, testing, accessibility, problem alignment · Top 10 must have a working deployed link.
- **Stack (locked):** Next.js 15 + TypeScript strict · Tailwind · Zod · SQLite (`better-sqlite3`, raw SQL, no ORM) · `bcryptjs` · Gemini (`@google/genai`) with deterministic fallback · Vitest + Playwright + axe · Docker → Cloud Run (min=max=1 instance).
- **Key design choices:** Guest-first with just-in-time auth · access request = booking in `pending_approval` · deterministic allocation engine + AI only explains/searches/drafts · demo mode with seeded role accounts · lazy sweeps instead of background jobs.
- **Doc map:** `AGENTS.md` (entry) · `PRD.md` (what) · `ARCHITECTURE.md` (how) · `RULES.md` (limits) · `PHASES.md` (order) · `DESIGN.md` (UI) · `MEMORY.md` (this).

---

## 3. Phase Tracker  _(update status each checkpoint: ⬜ not started · 🟨 in progress · ✅ done)_
| # | Phase | Status | Checkpoint date | Notes |
|---|---|---|---|---|
| 0 | Scaffold & tooling | ⬜ | | |
| 1 | Data layer & security primitives | ⬜ | | |
| 2 | Seed data | ⬜ | | |
| 3 | Auth, sessions, RBAC, demo | ⬜ | | |
| 4 | Public catalogue & keyword search | ⬜ | | |
| 5 | Availability & direct booking | ⬜ | | |
| 6 | Projects, approvals, notifications | ⬜ | | |
| 7 | Conflict detection & allocation engine | ⬜ | | |
| 8 | Conflict resolution UI (HITL) | ⬜ | | |
| 9 | AI layer + fallbacks | ⬜ | | |
| 10 | In-charge & equipment management | ⬜ | | |
| 11 | Admin | ⬜ | | |
| 12 | Hardening, a11y, UX polish | ⬜ | | |
| 13 | Test completion & e2e | ⬜ | | |
| 14 | Docs, deploy, submission | ⬜ | | |

---

## 4. Done Log  _(append-only; newest at bottom)_
| Date | Phase/Task | What was done | Verification |
|---|---|---|---|
| 2026-11-23 | Planning | Read organiser briefing + problem statement; wrote PRD, ARCHITECTURE, RULES, PHASES, DESIGN, MEMORY, AGENTS/CLAUDE/GEMINI | Docs reviewed by user |

---

## 5. Decisions  _(append-only; format: ID · date · decision · reason · impact)_
- **D-001 · 2026-11-23 ·** Backend lives inside Next.js (Route Handlers → Services → Repositories). **Why:** one deployable, simpler Cloud Run, fewer failure points. **Impact:** no separate API server.
- **D-002 · 2026-11-23 ·** SQLite via `better-sqlite3` with raw SQL; no ORM. **Why:** zero-config evaluator run, fewer deps/native issues. **Impact:** Cloud Run must run `min=max=1` instance; data resets on redeploy (seed is idempotent).
- **D-003 · 2026-11-23 ·** Access request is a `Booking` in `pending_approval` (no separate AccessRequest table). **Why:** simpler model and state machine. **Impact:** PRD §9/§10 updated.
- **D-004 · 2026-11-23 ·** Pending requests don't block each other (soft holds); only `approved`/`checked_in` bookings and maintenance block. Overlapping eligible requests form a ConflictGroup. **Why:** enables fair, explainable allocation instead of first-come-first-served.
- **D-005 · 2026-11-23 ·** `bcryptjs` (cost 12) over native argon2. **Why:** avoids native build issues in Docker/evaluator.
- **D-006 · 2026-11-23 ·** Own session auth (no NextAuth/JWT). **Why:** fewer deps/secrets, full control for security scoring.
- **D-007 · 2026-11-23 ·** No background jobs/websockets; lazy `sweepExpired()` and notification polling. **Why:** Cloud Run simplicity.
- **D-008 · 2026-11-23 ·** Gemini model id is configurable (`GEMINI_MODEL`); verify the current id in Gemini docs during Phase 9.

---

## 6. Deviations from PRD/Architecture  _(none yet)_
| Date | What changed | Why | Docs updated? |
|---|---|---|---|

---

## 7. Known Issues / Tech Debt  _(none yet)_
| ID | Description | Severity | Phase to fix |
|---|---|---|---|

## 8. Blockers & Open Questions
- Need from user at deploy time: Google Cloud project, Cloud Run region (suggested `asia-south1`), `GEMINI_API_KEY` (optional — app works without it), GitHub repo URL.
- Confirm Gemini model id at Phase 9.

---

## 9. Environment Notes  _(fill as discovered)_
- Node version: _(tbd — target 22 LTS)_
- Package manager: npm
- Local run: `npm install && npm run dev` → http://localhost:3000
- Demo logins: _(document after Phase 3; also in README)_
- Docker available in dev env? _(tbd)_
- Cloud Run service URL: _(tbd)_

---

## 10. Checkpoint Template  _(copy into Done Log / Status at each checkpoint)_
```
Checkpoint: Phase N — <name> — <date/time>
Done: <bullets of what was implemented, with requirement IDs>
Verify: lint ✅/❌ · typecheck ✅/❌ · unit/integration ✅/❌ (n tests) · e2e ✅/❌/n/a · build ✅/❌
Decisions: <new D-xxx entries or "none">
Deviations / issues: <or "none">
Repo size: <MB>  ·  npm audit (high/critical): <count>
Next: <next 3 actions>
```

## 11. Session Handoff Checklist  _(before ending any session)_
- [ ] Code committed on the single branch; working tree clean
- [ ] `npm run verify` result recorded in Current Status
- [ ] Phase Tracker updated; Done Log row appended
- [ ] Open problems written under Blockers / Known Issues
- [ ] "Next 3 actions" are specific enough for a fresh agent to start immediately
