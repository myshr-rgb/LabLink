# PHASES.md — Build plan for LabLink

> Each phase is a vertical, verifiable slice sized for one focused agent session (~1–2 h). Do phases **in order**. Finish the **Exit criteria** before starting the next. At the end of every phase run the **Checkpoint** (RULES §10).
> Requirement IDs refer to `PRD.md`. Design → `DESIGN.md`. Structure → `ARCHITECTURE.md §10`.

**Prompt template for the agent:**
> Read `AGENTS.md` and `MEMORY.md`. Execute **Phase N** from `PHASES.md`, following `RULES.md`. Do only that phase. When all exit criteria pass, run the checkpoint and update `MEMORY.md`.

**Checkpoint (every phase):** `npm run verify` green → update `MEMORY.md` (Status, Done log, Decisions, Issues, Next) → commit `chore(memory): checkpoint phase N`.

---

## Phase 0 — Scaffold & tooling
**Goal:** empty but production-shaped app that builds, lints, tests, and runs with zero config.
**Reqs:** F-72, SEC-12, SEC-14, SEC-18
- [ ] `create-next-app` equivalent: Next.js App Router, TypeScript strict, `src/` dir, Tailwind, path alias `@/`
- [ ] Install **only** allow-listed deps (RULES §3.1); commit lockfile
- [ ] ESLint (with `no-restricted-imports` boundaries from RULES §4, `react/no-danger`), Prettier, `tsc` config
- [ ] `package.json` scripts: `dev build start lint typecheck test test:e2e seed verify`
- [ ] `src/lib/config.ts` (zod env), `errors.ts`, `logger.ts`
- [ ] `GET /api/health` (inside `apiHandler` stub or plain until Phase 1)
- [ ] Vitest + Playwright configs with one trivial passing test each
- [ ] `.gitignore`, `.dockerignore`, `.env.example`, `Dockerfile` (multi-stage, non-root, standalone), `scripts/check-repo-size.mjs`
- [ ] README skeleton; `docs/` folder
**Exit:** `npm run verify` ✅ · `npm run dev` serves `/` · `/api/health` → 200 · `docker build` succeeds (if Docker available; else note in MEMORY).

## Phase 1 — Data layer & security primitives
**Goal:** DB, schema, and the secure request pipeline that every later feature uses.
**Reqs:** SEC-03, 06, 07, 09, 10, 11, 13, 16 (foundations)
- [ ] `schema.sql` per ARCHITECTURE §8 + indexes; `client.ts` singleton (WAL, FK on); idempotent `migrate.ts`; auto-init on first `getDb()`
- [ ] Repositories skeleton + row↔domain mappers; `types/domain.ts`
- [ ] `lib/booking/time.ts` (IST offset, slot helpers) + `overlap.ts` (pure)
- [ ] `lib/security`: `api-handler.ts`, `rate-limit.ts`, `origin.ts`, `headers.ts`, `request-id.ts`, `sanitize.ts`; `src/middleware.ts` (CSP nonce + headers)
- [ ] Migrate `/api/health` to `apiHandler`
- [ ] Tests: overlap/time edge cases, rate limiter, origin check, error mapping, apiHandler pipeline order
**Exit:** verify ✅ · response headers include CSP/nosniff/frame-ancestors · 429 and 422 shapes match RULES §5.

## Phase 2 — Seed data
**Goal:** rich, realistic, deterministic demo data (also a test fixture source).
**Reqs:** F-71
- [ ] 5 departments (CSE, ECE, EEE, Mechanical, Biotech), 8 labs, **≥ 36 equipment** (oscilloscopes, logic analysers, FPGA boards, ESP32/Arduino/Raspberry Pi kits, 3D printers, GPU workstations, VR kits, soldering stations, spectrum analyser, microscopes, etc.) with tags, specs, access types (mix of `open`, `approval`, `dept_only`; scarce items = `approval`, a few `requires_incharge_approval`)
- [ ] Users (fictional, `@example.edu`): demo student, faculty, in-charge, admin + ≥ 12 students, 4 faculty, 3 in-charges
- [ ] Projects with varied deadlines/priorities; historical bookings (usage hours, a couple of no-shows)
- [ ] **Demo conflict scenario:** 3 overlapping `faculty_approved` bookings on one scarce FPGA board (different deadlines, usage history, priorities) so F-41 shows a clear, explainable ranking and alternatives
- [ ] `scripts/seed.ts`; seed runs only when DB empty; tiny SVG images in `public/equipment`
**Exit:** `npm run seed` idempotent · counts asserted in a test · repo size check passes.

## Phase 3 — Auth, sessions, RBAC, demo mode
**Goal:** secure login/signup, just-in-time auth dialog, roles.
**Reqs:** F-01, F-02, SEC-01, 02, 04, 05 (guards), 11, 17, 19, UX-01..03
- [ ] `password.ts` (bcryptjs 12), `password-policy.ts`, `session.ts` (create/validate/rotate/destroy), `guards.ts` (`requireRole`, `assertOwner`)
- [ ] `/api/auth/{signup,login,logout,me,demo}`; signup → student only; login lockout via rate limit; generic error messages
- [ ] UI: `/login`, `/signup`, `AuthDialog` (resumes pending action), `DemoLogin` (only when `DEMO_MODE`), header user menu
- [ ] Audit events for signup/login/logout/failures
- [ ] Tests: signup role forced, login errors generic, session expiry/rotation, rate limit, RBAC matrix scaffold, demo mode off ⇒ 404
**Exit:** verify ✅ · e2e: demo login for each role works · cookies have HttpOnly/SameSite.

## Phase 4 — Public catalogue & search (keyword)
**Goal:** Guest can browse, filter, and view equipment.
**Reqs:** F-10, F-11, F-13 (partial), UX-04, 05, 07, A11Y-01..04
- [ ] Equipment repo/service/API (`GET /equipment`, `/equipment/:id`) with filters, sort, pagination, LRU cache
- [ ] Pages: Home (search hero), `/equipment`, `/equipment/[id]` (details only), `/how-it-works`
- [ ] Components per DESIGN §6: `EquipmentCard`, `EquipmentFilters`, `SearchBox`, states (skeleton/empty/error)
- [ ] URL-synced filters; keyword/tag search function (`searchService.keyword`) also used later as AI fallback
- [ ] Tests: filters AND-combine, pagination, cache invalidation, axe on `/` and `/equipment`
**Exit:** verify ✅ · Guest flow works without login · Lighthouse/axe no critical issues.

## Phase 5 — Availability & direct booking engine
**Goal:** correct, race-safe slot booking for open equipment.
**Reqs:** F-13, F-20, F-21, F-22, F-23 (partial), SEC-05, SEC-16
- [ ] `lib/booking`: `slots.ts` (generate 30-min slots), `rules.ts` (hours, duration, advance window), `transitions.ts` (state machine table from ARCHITECTURE §6.2)
- [ ] `GET /equipment/:id/availability` (14 days; blocking bookings + maintenance)
- [ ] `bookingService.create` (transactional, re-check overlap inside `.immediate()` txn) → `approved` for open equipment; `SLOT_TAKEN` + alternatives on clash
- [ ] `/bookings` page: list, cancel, modify; ownership checks (404 for foreign)
- [ ] UI: `AvailabilityGrid` + `SlotPicker` (keyboard-navigable, list twin), booking confirm panel, resume-after-login draft
- [ ] Lazy `sweepExpired()` (no-show after 15 min grace)
- [ ] Tests: transition table, rules, **concurrent double-booking**, IDOR, adjacent slots allowed
**Exit:** verify ✅ · e2e: Guest → pick slot → login prompt → resume → booked.

## Phase 6 — Projects, approvals, notifications
**Goal:** project-based access requests and faculty approval.
**Reqs:** F-30, F-31, F-33, F-35 (basic), F-50, SEC-05
- [ ] Project CRUD (+ members, guide must be faculty, future deadline)
- [ ] Booking create for `approval` equipment → `pending_approval` (project required); `changes_requested` → resubmit
- [ ] `/approvals` queue + decision endpoint (approve/reject/changes + comment); only guide/Admin
- [ ] Notifications repo/service/API + header bell (poll 60 s) + `/notifications`
- [ ] `tryConfirm` stub: when no competitors → `approved` (conflict handling arrives in Phase 7–8)
- [ ] Tests: approval authz matrix, transitions, notification fan-out, project validation
**Exit:** verify ✅ · e2e: student requests restricted item → faculty approves → booking `approved`.

## Phase 7 — Conflict detection & allocation engine (pure core)
**Goal:** the fairness brain, fully tested and deterministic.
**Reqs:** F-40, F-41, F-42 (template), F-43 (rule-based), F-47
- [ ] `lib/allocation`: `factors.ts`, `score.ts`, `allocate.ts` (greedy, tie-breaks), `alternatives.ts`, `explain-template.ts`, `types.ts` — per ARCHITECTURE §6.3
- [ ] `conflictService`: detect groups on `tryConfirm`, build engine input (usage 14 d, no-shows 60 d), persist `ConflictGroup` + `AllocationDecision`
- [ ] Policy config repo (default weights + quota) — read-only for now
- [ ] Tests (≥ 25 cases): determinism, tie-breaks, zero history, all-equal, nested/adjacent windows, weight edge cases, alternatives selection, template numbers match factors
**Exit:** verify ✅ · seeded conflict scenario produces expected ranking (asserted) · coverage ≥ 90% on `lib/allocation`.

## Phase 8 — Conflict resolution UI & human-in-the-loop
**Goal:** in-charge can review, accept, or override with reasons.
**Reqs:** F-42 (UI), F-43, F-44, F-46 (maintenance, basic), SEC-19
- [ ] `/conflicts` list + `/conflicts/[id]`: ranked table, `FactorBars`, reason text, `AlternativeList`, "awaiting approval" competitors
- [ ] `POST /conflicts/:id/resolve` (`accept` | `override` + reason); transactional status changes; notifications to winners/losers with alternatives; audit with recommendation snapshot
- [ ] "Request alternative" one-click prefill for displaced users
- [ ] Maintenance block creation → affected bookings reschedule proposals
- [ ] Tests: accept/override flows, override validation (no overlaps, reason required), notifications, authz (only lab's in-charge/Admin)
**Exit:** verify ✅ · e2e: open seeded conflict → accept → winners approved/losers displaced + notified.

## Phase 9 — AI layer (with fallbacks)
**Goal:** Gemini enhances search, explanations, drafting — safely.
**Reqs:** F-12, F-32, F-42 (AI phrasing), F-15, SEC rules in RULES §7
- [ ] `lib/ai/client.ts` (`generateJson`, timeout, key optional), `prompts.ts`, `schemas.ts`
- [ ] `search.ts` (retrieve ≤ 20 candidates → AI re-rank → id-subset validation → fallback), `/api/search/ai` (public, rate-limited, cached), UI `AiResults` with source label
- [ ] `explain.ts` (phrase reasons; store `ai_reason_text`; template remains), `draft.ts` + "Suggest justification" button in request form
- [ ] Tests with mocked client: success, timeout, invalid JSON, hallucinated ids, no API key, prompt-injection strings in input are treated as data
**Exit:** verify ✅ · app fully works with `GEMINI_API_KEY` unset · AI source label visible.

## Phase 10 — In-charge & equipment management
**Reqs:** F-14, F-26, F-34, F-46
- [ ] `/lab` dashboard (today's bookings, check-in/out, no-shows), equipment create/edit/retire (own lab only), maintenance blocks
- [ ] In-charge second approval for restricted equipment
- [ ] Tests: lab ownership authz (403/404), check-in/out transitions, retire hides from catalogue
**Exit:** verify ✅.

## Phase 11 — Admin
**Reqs:** F-45, F-60, F-61, F-70, SEC-04, SEC-17
- [ ] `/admin/users` (list, change role, disable; demo-Admin read-only), `/admin/policy` (validated weights, audited), `/admin/analytics` (utilisation %, idle items, peak hours, most-conflicted; accessible chart + table), `/admin/audit` (paginated)
- [ ] Tests: only Admin; weights validation; role change audited; analytics queries correct on seed
**Exit:** verify ✅.

## Phase 12 — Hardening, accessibility & UX polish
**Reqs:** SEC-01..20 audit, A11Y-01..07, UX-04..09
- [ ] Walk the SEC checklist; add missing tests; `npm audit --omit=dev` clean of high/critical
- [ ] Verify headers/CSP in browser; no inline script violations; cookie flags
- [ ] Keyboard-only run-through of all flows; fix focus order/visible focus; reduced motion; contrast check
- [ ] Review all loading/empty/error states and microcopy (DESIGN §9)
- [ ] Remove dead code, `console.log`, TODOs; enforce size limits
**Exit:** verify ✅ · axe: 0 critical/serious on all main pages.

## Phase 13 — Test completion & e2e
- [ ] Fill gaps to coverage targets (≥ 80% on `lib/allocation`, `lib/booking`, `lib/auth`)
- [ ] e2e: `smoke.spec.ts` (Guest → search → slot → login → book → faculty approve → conflict explained), `a11y.spec.ts`
- [ ] RBAC matrix and IDOR suites complete
**Exit:** `npm run verify` ✅ · `npm run test:e2e` ✅ against production build.

## Phase 14 — Docs, deploy, submission
- [ ] README final (quick start, demo logins, env vars, AI fallback, tests, deploy, security + a11y notes)
- [ ] Cloud Run deploy per ARCHITECTURE §12; set `DEMO_MODE=true`, `APP_URL`, secrets; min/max instances = 1
- [ ] Smoke test live URL from an incognito window (health, Guest browse, demo logins, booking, conflict page)
- [ ] Repo check: public, `.git` URL, one branch, < 10 MB, no secrets in history
- [ ] Complete `PRD.md §15` checklist; draft LinkedIn post text in `docs/linkedin-post.md`
**Exit:** all checklist items ticked · live URL healthy.

## Phase 15 — Backlog (only if time remains)
F-24 waitlist · F-25 team bookings · F-51 email · F-62 AI utilisation summary · F-48 assistant · F-27 recurring · CSV import/export · dark mode · SLA escalation.

---

## Dependency Map & Parallelism
```
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14
              └─ 7 (pure engine) can start after 2 and run in parallel with 4–6
              └─ 9 (AI) can start after 4 (search) and 7 (explain)
              └─ 10, 11 are independent of each other after 8
```
Cut line if time is short: **Phases 0–8 + 12–14 are the minimum winning product** (everything works, AI via fallback). Phase 9 adds the GenAI story; do it before 10–11.
