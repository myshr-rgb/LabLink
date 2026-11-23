# MEMORY.md — Living project memory

> **Purpose:** single source of truth for *what happened, what is happening, what's next*. Any agent can resume from this file alone.
> **Rules:** Read the **Current Status** first at every session start. **Update at every checkpoint** (end of each phase, any milestone > ~45 min, any decision/deviation, and before ending a session). Overwrite *Current Status*; **append** to *Done Log*, *Decisions*, *Issues*. Keep this file under ~300 lines — compact old Done Log rows into one-liners when it grows.

---

## 1. Current Status  _(overwrite each checkpoint)_
| Field | Value |
|---|---|
| Last updated | 2026-11-23 |
| Project stage | Phase 1 verified |
| Active phase | **Phase 2 — Seed data** (next session) |
| Last checkpoint | Phase 1 — Data layer & security primitives |
| Last `npm run verify` | Passed with zero warnings. Lint, strict typecheck, 17 tests, production build, size gate. |
| Last `npm run test:e2e` | 1 passed. Chromium verified the rendered script nonce, fresh CSP, nosniff and HTTP 200 health envelope. |
| Live URL | Pending deployment |
| Repo | https://github.com/myshr-rgb/LabLink.git · main · source under 0.5 MB |
| Attempts used (submission) | 0 / 2 |
| Blockers | Docker CLI unavailable for local image build. |

**Next 3 actions:**
1. Prepare deterministic department, lab, equipment and fictional user fixtures.
2. Add projects, usage history and the three-request FPGA conflict fixture.
3. Gate seeding on an empty departments table and test counts and repeat runs.

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
| 0 | Scaffold & tooling | ✅ | 2026-11-23 | Verified locally. Docker unavailable. |
| 1 | Data layer & security primitives | ✅ | 2026-11-23 | Schema v1, booking primitives, security pipeline and CSP verified. |
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
| 2026-11-23 | Phase 0 · F-72, SEC-12/14/18 | Scaffold, version-zero SQLite bootstrap, health probe, tooling and standalone Dockerfile | verify passed (2 tests), Playwright 1 passed, production audit 0 vulnerabilities, source < 0.5 MB. Docker unavailable. |
| 2026-11-23 | Phase 1 · SEC-03/06/07/09/10/11/13/16 | Migrated fresh and v0 databases, added repository mappings, IST/overlap helpers, session lookup, API pipeline and nonce middleware | verify passed (17 tests, 6 files), Playwright 1 passed, source 432676 bytes before memory update, production audit 0 vulnerabilities. |

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
- **D-009 · 2026-11-23 ·** Phase 0 initializes SQLite schema version zero atomically. Domain tables and migrations belong to Phase 1, demo fixtures to Phase 2 (PHASES.md).
- **D-010 · 2026-11-23 ·** Pin Next’s transitive PostCSS to the patched approved PostCSS range. The generated npm lockfile exceeds the general 100 KB file cap and is retained for reproducible installs as required.
- **D-011 · 2026-11-23 ·** Use dynamic HTML rendering so Next embeds the middleware nonce in each response. Resolve production configuration at request time so image builds do not need deployment secrets.
- **D-012 · 2026-11-23 ·** Rate limiting uses named process-local sliding windows. Local requests share one client bucket. On Cloud Run the limiter uses the forwarded chain suffix; verify ingress behavior during deployment.

---

## 6. Deviations from PRD/Architecture  _(none yet)_
| Date | What changed | Why | Docs updated? |
|---|---|---|---|

---

## 7. Known Issues / Tech Debt
| ID | Description | Severity | Phase to fix |
|---|---|---|---|
| I-001 | Verify forwarded client address at the deployed Cloud Run ingress for per-client rate limiting. | Deployment check | 14 |

## 8. Blockers & Open Questions
- Need from user at deploy time: Google Cloud project, Cloud Run region (suggested `asia-south1`), `GEMINI_API_KEY` (optional — app works without it), GitHub repo URL.
- Confirm Gemini model id at Phase 9.

---

## 9. Environment Notes  _(fill as discovered)_
- Node version: 24.19.0 locally, container targets 22 LTS
- Package manager: npm 11.17.0
- Local run: `npm install && npm run dev` → http://localhost:3000
- Demo logins: _(document after Phase 3; also in README)_
- Docker CLI unavailable. Image build deferred to a Docker-enabled host.
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
