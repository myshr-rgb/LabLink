# LabLink — Product Requirements Document (PRD)

> **Audience:** AI coding agents (Claude Code, Codex, Antigravity) and humans.
> **Doc set:** `AGENTS.md` (entry) · `PRD.md` (what to build) · `ARCHITECTURE.md` (how) · `RULES.md` (limits) · `PHASES.md` (order) · `DESIGN.md` (UI) · `MEMORY.md` (status/history).
> **Read order:** `AGENTS.md` → `MEMORY.md` → active phase in `PHASES.md` → other docs on demand. If docs conflict: `RULES.md` > `ARCHITECTURE.md` > `PRD.md` for implementation detail; log the conflict in `MEMORY.md`.
> **Keywords:** MUST / MUST NOT / SHOULD are used as in RFC 2119. Every requirement has an ID. Reference IDs in commits and tests (e.g. `feat(F-41): ...`, `test(SEC-05)`).

---

## 1. Product Summary

**LabLink** is a GenAI-powered campus laboratory resource-sharing platform.
Students discover specialised equipment, dev kits and lab workstations across departments, book slots, raise project-based access requests, and get faculty approval. An AI layer resolves scheduling conflicts by recommending fair, feasible allocations based on project deadlines, availability and student requirements, and explains why.

**Problem:** equipment is siloed by department, booking is manual, clashes happen near deadlines, allocation is unfair, approvals are slow.

**Success = an automated AI evaluator that builds/runs the project scores it high on:** code quality, security, efficiency, testing, accessibility, problem-statement alignment. A human judge also checks the deployed Cloud Run URL works.

**Non-goals:** payments, IoT/RFID, native mobile apps, college SSO/ERP integration, asset-purchase/depreciation tracking.

---

## 2. Locked Decisions (do not re-ask; change only if the user says so)

| Topic | Decision | Reason |
|---|---|---|
| Language | TypeScript (strict mode) everywhere | Type safety, quality score |
| Framework | Next.js 15 (App Router) full-stack, single deployable | One container on Cloud Run, fewer moving parts |
| Backend | **Required, and built inside Next.js:** Route Handlers (wrapped by one `apiHandler`) → Services → Repositories → SQLite. No separate server | Secure, testable, single deploy (see `ARCHITECTURE.md §2–3`) |
| UI | Tailwind CSS + accessible primitives (Radix UI or equivalent) | Accessibility, speed |
| Validation | Zod on every external input (API, forms, AI output) | Security |
| Database | SQLite via `better-sqlite3` with hand-written SQL in a repository layer (**no ORM**), auto-created and **seeded on first boot** | Zero-config run for the evaluator; repository layer allows swap to Cloud SQL/Firestore |
| Auth | Own email+password (`bcryptjs`, cost 12), server-side sessions in httpOnly cookies. **No third-party auth, no JWT** | Fewer secrets, no native build issues, runs anywhere |
| Time | UTC in storage/API; campus timezone fixed at IST (UTC+05:30); 30-minute slots | Simple, no DST, no date library |
| AI | Gemini via `@google/genai` (AI Studio key or Vertex). **Every AI feature MUST have a deterministic non-AI fallback** | Works with no API key; evaluator-safe |
| Tests | Vitest (unit/integration) + Playwright (smoke e2e) | Testing score |
| Deploy | Dockerfile (multi-stage, non-root) → Google Cloud Run with `--min-instances=1 --max-instances=1` | Required by event; single instance keeps SQLite, rate-limits and cache consistent and avoids scale-to-zero resets |
| Package manager | npm with committed lockfile | Reproducible |

**Zero-config rule:** `npm install && npm run dev` MUST work with no `.env`, no external services, and no API key. Missing `GEMINI_API_KEY` ⇒ AI features silently use the deterministic fallback and the UI labels it "Smart suggestions (rule-based)".

---

## 3. Users & Roles

| Role | Who | Can do |
|---|---|---|
| **Guest** (no login) | Anyone | Browse/search catalogue, view equipment details and availability calendar, read how-it-works, try AI search |
| **Student** | Registered user | Everything Guest + create projects, book, submit access requests, manage own bookings |
| **Faculty** | Project guide | Approve/reject/endorse requests for their students, see their students' usage |
| **Lab In-charge** | Equipment owner | CRUD equipment for own lab, check-in/out, block maintenance, confirm/override AI allocations |
| **Admin** | HOD/Dean | Everything + user/role management, fairness policy, analytics |

Self-signup creates **Student only**. Faculty/In-charge/Admin are created by seed or promoted by Admin (SEC-04).

---

## 4. Access Model — "Login only when needed" (Guest-first)

**Principle:** the app is fully explorable without an account. Authentication is requested **just-in-time**, at the moment of a protected action, and the user's intent is **preserved** and resumed after login/signup.

| Action | Auth required? | Min role |
|---|---|---|
| Home, catalogue, search (incl. AI search), equipment detail, availability calendar | **No** | Guest |
| Select a slot (UI interaction) | **No** (selection kept in state) | Guest |
| Confirm booking / submit access request | **Yes** → inline login/signup prompt | Student |
| Create/edit project, view "My bookings" | Yes | Student |
| Approvals queue | Yes | Faculty |
| Equipment management, maintenance, check-in/out | Yes | Lab In-charge |
| Analytics, policy, user management | Yes | Admin |

**UX-01 Just-in-time auth:** when a Guest triggers a protected action, show a modal/page "Sign in to confirm your booking" with the context (equipment + slot) visible. After success, **resume the exact action** (`returnTo` + saved draft). No lost form data.
**UX-02 Minimal signup:** fields = name, email, password (+ optional department). No email-verification wall in MVP. Password rules shown inline.
**UX-03 Demo access:** when `DEMO_MODE=true` (default **on** in the hackathon deployment, **off** by default in code), a "Try demo as Student / Faculty / In-charge / Admin" panel is shown on the login screen. Demo users are seeded, documented in README, and demo-Admin is read-mostly (cannot delete users or change passwords). Purpose: evaluator and judges can test every role in seconds.

---

## 5. Functional Requirements

Priority: **P0** = MVP, must ship. **P1** = should. **P2** = stretch. Build P0 fully before any P1.
Each feature has **Acceptance Criteria (AC)** that map 1:1 to tests.

### 5.1 Catalogue & Discovery (public)
| ID | Pri | Feature | AC |
|---|---|---|---|
| F-10 | P0 | Equipment list: name, category, department, lab/location, specs, image, status (available/maintenance/retired), usage rules, access type (open / approval-required / dept-only) | List renders from seed ≥ 30 items across ≥ 4 departments; paginated |
| F-11 | P0 | Keyword search + filters (department, category, availability date, access type) + sort | Filters combine (AND); URL reflects filters (shareable); empty state shown |
| F-12 | P0 | **AI natural-language search**: "board to prototype a BLE sensor node" → ranked matches with a one-line reason each | Returns ≤ 10 ranked results with `reason`; fallback = keyword/tag scoring; works as Guest; rate limited |
| F-13 | P0 | Equipment detail + live availability calendar (next 14 days) | Shows free/booked/maintenance slots; accessible as a list too (not calendar-only) |
| F-14 | P0 | In-charge CRUD for equipment (own lab only) | Server rejects edits to other labs (403); validation errors shown inline |
| F-15 | P1 | AI "similar/alternative equipment" on detail page and when unavailable | Suggests ≥ 1 alternative with reason; fallback = same category+overlapping tags |

### 5.2 Slot Booking
| ID | Pri | Feature | AC |
|---|---|---|---|
| F-20 | P0 | Slot picker (date, start, end) on equipment page | Respects opening hours, min/max duration, advance-booking window |
| F-21 | P0 | Create booking | **No double booking:** overlap with a *confirmed* booking (`approved`/`checked_in`) or maintenance block is rejected atomically (`.immediate()` transaction, re-checked inside) with `409 SLOT_TAKEN` + alternatives. Overlapping *pending* requests are allowed (soft holds) and trigger conflict resolution (F-40). Tested with concurrent attempts |
| F-22 | P0 | My bookings: view, modify, cancel | Only owner can modify (object-level auth); cancel frees the slot immediately |
| F-23 | P0 | Status lifecycle: `pending_approval → faculty_approved → approved → checked_in → completed`; exits: `changes_requested`, `rejected`, `cancelled`, `no_show`, `displaced` (full table in `ARCHITECTURE.md §6.2`) | Illegal transitions rejected (`INVALID_TRANSITION`); every transition audited |
| F-24 | P1 | Waitlist with auto-promotion on cancellation | First eligible waitlisted user promoted, notified |
| F-25 | P1 | Team bookings (project members) | Members listed; quota counted per project |
| F-26 | P1 | Check-in/out + no-show auto-release after grace period (default 15 min) | Slot reopens; no-show recorded for fairness |

### 5.3 Projects & Access Requests
| ID | Pri | Feature | AC |
|---|---|---|---|
| F-30 | P0 | Project: title, description, team, faculty guide, deadline, required equipment | Deadline must be a future date; guide must be a Faculty user |
| F-31 | P0 | Access request = a booking in `pending_approval` linked to a project (equipment, window, justification). `open` equipment skips approval and is confirmed immediately | Cannot submit without a project when equipment is `approval`-type; request visible to its faculty guide |
| F-32 | P1 | AI request-drafting: turns project description into a clear justification + suggests equipment | User edits before submit; fallback = template text |
| F-33 | P0 | Faculty approval queue: approve / reject / request changes + comment | Only the project's guide (or Admin) can act; student notified |
| F-34 | P1 | Second approval by In-charge for restricted equipment | Both must approve for `approved` |
| F-35 | P1 | Faculty sets project priority (normal / high / deadline-critical) | Priority feeds F-41 |

### 5.4 AI Conflict Resolution & Fair Allocation (core differentiator)
| ID | Pri | Feature | AC |
|---|---|---|---|
| F-40 | P0 | Conflict detection: overlapping requests, maintenance clash, over-quota | Pure function with unit tests covering edge cases (adjacent slots, same-start, nested) |
| F-41 | P0 | Allocation recommender. Score per request from weighted factors: **deadline proximity, faculty priority, remaining quota / past usage (fair-share), submission time, no-show history**. Default weights in config; Admin-editable (P1) | Deterministic for same input; returns ranked allocation + alternatives |
| F-42 | P0 | **Explainability:** each decision includes human-readable reasons and the factor breakdown | e.g. "Team A gets Fri 2–4pm: demo in 3 days, 2h used this week vs 9h for Team B." Shown in UI |
| F-43 | P0 | Alternatives for losing requests: next free slot, equivalent equipment, other lab | ≥ 1 alternative when one exists; else says none and why |
| F-44 | P0 | Human-in-the-loop: In-charge/Faculty can accept, edit or override; override requires a reason | Override stored in audit log |
| F-45 | P1 | Admin fairness policy editor (weights) | Weights validated (sum/range); changes audited |
| F-46 | P1 | Maintenance auto-reschedule: marking equipment down finds affected bookings and proposes moves | Notifications sent with explanation |
| F-47 | P0 | **Architecture rule:** deterministic engine decides feasibility and ranking. Gemini is used only to (a) phrase the explanation, (b) suggest/rank alternatives, (c) NL search, (d) draft text. The AI **never** writes to the DB directly; its output is schema-validated first | Disabling the AI keeps all P0 flows working |
| F-48 | P2 | Conversational assistant ("free logic analyser before Friday?") | Uses same validated tool functions as UI |

### 5.5 Notifications, Analytics, Foundations
| ID | Pri | Feature | AC |
|---|---|---|---|
| F-50 | P0 | In-app notifications (approvals, reschedules, conflicts, reminders) | Unread count; mark read |
| F-51 | P1 | Email notifications | Behind env flag; off by default |
| F-60 | P1 | Admin utilisation dashboard: usage %, idle equipment, peak hours, most-conflicted items | Accessible charts with table equivalents |
| F-62 | P2 | AI-written utilisation summary for admins | Fallback = templated summary |
| F-70 | P1 | Audit log (bookings, approvals, overrides, AI decisions, auth events) | Append-only; viewable by Admin |
| F-71 | P0 | Seed data: 4–5 departments, ≥ 30 equipment, 4 demo users (one per role) + ≥ 10 students, sample projects, **a pre-built conflict scenario** to demo F-41 | Idempotent seed; repo stays < 10 MB |
| F-72 | P0 | `GET /api/health` returns 200 + version | Used for Cloud Run checks and smoke test |

---

## 6. AI Design Rules

1. **Hybrid:** rules decide; Gemini explains/understands.
2. **Fallback everywhere:** AI timeout (default 8 s), error, or missing key ⇒ deterministic result, UI still works.
3. **Structured output:** request JSON via schema; validate with Zod; reject and fall back on mismatch.
4. **Prompt-injection safety:** user text (project descriptions, justifications, search queries) is passed as **data**, in clearly delimited fields; system prompt states it must be ignored as instructions; AI output is never executed, never used as a query/command, and rendered as escaped text.
5. **Least data:** send only fields needed (no emails, passwords, session data).
6. **Cost/abuse control:** per-IP and per-user rate limits on AI endpoints; max input length (e.g. 500 chars query, 2,000 chars description); cache identical queries briefly.
7. **Transparency:** UI shows when a result is AI-assisted vs rule-based.

---

## 7. Security Requirements (HIGH PRIORITY — scored)

An automated AI evaluator will inspect code and probe behaviour. Treat each as a test.

| ID | Requirement |
|---|---|
| SEC-01 | **Passwords:** hash with argon2id or bcrypt (cost ≥ 12). Never log or return hashes. Min length 10; check against a small common-password list. |
| SEC-02 | **Sessions:** random 256-bit IDs, stored server-side, cookie flags `HttpOnly; Secure (in prod); SameSite=Lax`, idle + absolute expiry, rotate on login, destroy on logout. |
| SEC-03 | **AuthZ on the server for every route/action** via one central guard (`requireRole`, `requireOwnership`). UI hiding is never the control. |
| SEC-04 | **No privilege escalation:** signup always creates `student`; role fields are ignored in client input (mass-assignment protection via explicit Zod schemas). Role changes Admin-only and audited. |
| SEC-05 | **Object-level authorisation (anti-IDOR):** users only read/modify their own bookings/projects/requests; Faculty only their students'; In-charge only their lab. Tests prove 403/404 on cross-user access. |
| SEC-06 | **Input validation:** Zod schema on every API body, query and param; reject unknown keys; enforce length/range/enum. |
| SEC-07 | **SQL safety:** parameterised queries only; no string-built SQL. |
| SEC-08 | **XSS:** rely on framework escaping; never use `dangerouslySetInnerHTML` with user/AI content; strict **CSP** (no `unsafe-eval`; nonces if inline needed). |
| SEC-09 | **CSRF:** SameSite cookies + CSRF token or Origin/Host check on all state-changing requests. |
| SEC-10 | **Security headers:** CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`/`X-Frame-Options: DENY`, HSTS in prod. |
| SEC-11 | **Rate limiting:** login/signup (e.g. 5 attempts/min/IP+account with backoff), AI endpoints, booking creation. Return 429 with `Retry-After`. |
| SEC-12 | **Secrets:** none in repo or git history. Config via env vars; `.env.example` lists names with fake values; `.env` git-ignored; Cloud Run uses env/Secret Manager. |
| SEC-13 | **Errors:** generic client messages, no stack traces, no enumeration (same message for unknown email vs wrong password). Detailed errors only in server logs, with no PII/secrets. |
| SEC-14 | **Dependencies:** minimal deps, lockfile committed, `npm audit` clean of high/critical at submission, no abandoned packages. |
| SEC-15 | **CORS:** same-origin by default; no wildcard with credentials. |
| SEC-16 | **Booking integrity:** race-safe double-booking prevention (DB transaction/constraint), server-side time validation (never trust client time). |
| SEC-17 | **Demo mode safety:** demo accounts only when `DEMO_MODE=true`; demo-Admin cannot manage users/credentials; no default real admin password anywhere in code. |
| SEC-18 | **Container:** non-root user, minimal base image, no dev deps in final stage, no secrets baked into image. |
| SEC-19 | **Audit:** log auth events, role changes, approvals, overrides, AI-assisted decisions (who/what/when), append-only. |
| SEC-20 | **No file uploads in MVP** (equipment images are seeded static assets) to remove an attack surface. |

---

## 8. Usability & Accessibility Requirements (scored)

| ID | Requirement |
|---|---|
| UX-01..03 | See Section 4 (just-in-time auth, minimal signup, demo access). |
| UX-04 | **Task efficiency:** Guest → find equipment → booking submitted in ≤ 4 interactions plus login if needed. |
| UX-05 | Every screen has designed **loading, empty, error, success** states; no dead ends; clear primary action. |
| UX-06 | Plain-language, specific errors ("That slot was just taken — here are 3 nearby options"), shown next to the field and announced to screen readers. |
| UX-07 | Mobile-first responsive layout (≥ 360 px), touch targets ≥ 44 px. |
| UX-08 | Confirmations and undo/cancel for destructive or booking actions; show what will happen before submit. |
| UX-09 | Consistent navigation, role-aware menu, breadcrumbs on detail pages, visible current location. |
| UX-10 | Dark/light follow system preference (P2). |
| A11Y-01 | Target **WCAG 2.1 AA**. Semantic landmarks (`header/nav/main/footer`), one `h1` per page, logical heading order. |
| A11Y-02 | Fully **keyboard operable**, visible focus rings, no keyboard traps, skip-to-content link; calendar has a keyboard-navigable list alternative. |
| A11Y-03 | Contrast ≥ 4.5:1 (text) / 3:1 (UI); never colour-only status (add text/icon). |
| A11Y-04 | All inputs have associated `<label>`; errors linked via `aria-describedby`; `aria-live` for async results (AI search, notifications). |
| A11Y-05 | Images have meaningful `alt`; charts have text/table alternatives. |
| A11Y-06 | Respect `prefers-reduced-motion`. |
| A11Y-07 | Stable `data-testid` and accessible names on key controls so automated testers can drive the UI reliably. |

---

## 9. Data Model (entities & key fields)

All tables: `id` (UUID), `created_at`, `updated_at`. Use foreign keys and indexes on every FK and on `(equipment_id, start_at, end_at)`.

- **User**: name, email (unique, lowercased), password_hash, role, department_id, faculty_guide_id?, status
- **Department**: name, code
- **Lab**: name, department_id, location, in_charge_user_id
- **Equipment**: name, category, tags[], specs (JSON), lab_id, status, access_type, max_booking_minutes, opening_hours (JSON), image_path
- **Project**: title, description, owner_id, guide_id, deadline, priority, status
- **ProjectMember**: project_id, user_id
- **Booking** (also the "access request"): equipment_id, user_id, project_id?, start_at, end_at, status, justification, decision_note, incharge_approved_at?, conflict_group_id?, checked_in_at?
- **MaintenanceBlock**: equipment_id, start_at, end_at, reason, created_by
- **ConflictGroup**: equipment_id, window_start, window_end, status (`open`|`resolved`), resolved_by?, resolved_at?
- Full DDL, indexes and enums: `ARCHITECTURE.md §8` (authoritative)
- **Waitlist**: equipment_id, user_id, desired window, position (P1)
- **AllocationDecision**: conflict_group_id, booking_id, rank, score, factors (JSON), reason_text (deterministic template), ai_reason_text?, source (`rules`|`ai_assisted`), recommended_outcome, final_outcome?, overridden_by?, override_reason?
- **Notification**: user_id, type, payload, read_at
- **AuditLog**: actor_id?, action, entity, entity_id, metadata, ip_hash, at (append-only)
- **Session**: id_hash, user_id, expires_at
- **PolicyConfig**: weights (JSON), version

All times stored UTC ISO-8601; displayed in the user's locale (default `Asia/Kolkata`).

---

## 10. API Surface (REST, JSON, versionless, under `/api`)

Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/demo` (DEMO_MODE only)
Public: `GET /equipment`, `GET /equipment/:id`, `GET /equipment/:id/availability`, `POST /search/ai`
Student: `GET|POST /projects`, `GET|PATCH /projects/:id`, `GET|POST /bookings` (a booking in `pending_approval` is an access request), `PATCH /bookings/:id`, `DELETE /bookings/:id`
Faculty: `GET /approvals`, `POST /approvals/:id/decision`
In-charge: `POST|PATCH|DELETE /equipment…`, `POST /equipment/:id/maintenance`, `POST /bookings/:id/check-in`, `GET /conflicts`, `POST /conflicts/:id/resolve` (accept/override)
Admin: `GET|PATCH /admin/users/:id`, `GET|PUT /admin/policy`, `GET /admin/analytics`, `GET /admin/audit`
System: `GET /health`

Rules: consistent error shape `{ "error": { "code": "...", "message": "..." } }`; correct status codes (400/401/403/404/409/422/429); pagination `?page&pageSize` (max 50); idempotent where sensible.

---

## 11. Testing Requirements (scored)

- **Unit (Vitest), required:** conflict detection (F-40), allocation scoring + determinism + tie-breaks (F-41), slot validation, status-transition rules, Zod schemas, fallback ranker for AI search.
- **Integration, required:** auth (signup/login/logout/lockout), RBAC matrix (every role × key endpoint), IDOR cases (SEC-05), concurrent double-booking (SEC-16), approval flow, AI endpoint with the AI **mocked** and with fallback.
- **E2E smoke (Playwright), required:** Guest browses + searches → picks a slot → prompted to log in → resumes and books → faculty approves → conflict scenario shows an explained recommendation.
- **Accessibility:** automated axe checks on main pages in e2e.
- **Commands (must exist in package.json):** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run seed`.
- Target ≥ 80% coverage on `/lib/allocation`, `/lib/booking`, `/lib/auth`.
- CI-style one-liner `npm run verify` runs lint + typecheck + test + build.

---

## 12. Evaluator-Readiness (an AI runs and scores this)

Make the repo easy for an automated agent to understand, run, and probe:

1. **README.md** (top-level): what it is, 3-command quick start, demo credentials table, env var table, architecture sketch, how AI fallback works, test commands, deployment steps, security notes, accessibility notes.
2. Predictable structure exactly as in `ARCHITECTURE.md §10` (`src/app`, `src/components`, `src/services`, `src/lib/*`, `tests/`, `scripts/`, `docs/`).
3. Small, single-purpose functions; JSDoc on exported functions; no dead code, no `console.log` leftovers, no commented-out blocks, no TODOs in submitted code.
4. ESLint + Prettier configured and passing; TypeScript `strict`, no `any` without justification.
5. `.env.example`, `.gitignore` (node_modules, .next, .env, db files, coverage), `.dockerignore`.
6. Deterministic seed + a documented demo conflict scenario so behaviour can be verified quickly.
7. `GET /api/health` and a clear 404/error pages.
8. Repo rules: **one branch**, **< 10 MB**, public, URL ends in `.git`. No committed `node_modules`, build output, DB files or large images (use small SVG/WebP, ≤ 50 KB each).
9. Performance hygiene: DB indexes, pagination, avoid N+1 queries, memoised/cached catalogue reads, lazy-load heavy UI, no giant dependencies.

---

## 13. Submission & Delivery Constraints (from the organiser briefing)

- GitHub: **public**, URL ends with `.git`, **exactly one branch**, **< 10 MB**.
- Live app: public URL on **Cloud Run**, works with no private access. A dead link = disqualification even from the Top 10.
- LinkedIn post explaining what was built and how it solves the problem.
- **2 scored attempts; the latest counts** (not the best). Run the full checklist (Section 15) before each.
- Sign in to the platform with the exact registration email.
- Leaderboard = automated code assessment only; Top 10 then verified by deployment working.

---

## 14. Build Order (summary — the detailed, authoritative plan with tasks and exit criteria is `PHASES.md`)

1. **Scaffold:** Next.js + TS strict + lint/format + test runners + Dockerfile + `.env.example` + health route + README skeleton + security headers middleware.
2. **DB + seed:** schema, repository layer, idempotent seed with demo conflict scenario (F-71).
3. **Auth & RBAC:** signup/login/logout/sessions, central guards, demo mode, rate limits (SEC-01..04, 11, 17, UX-01..03).
4. **Catalogue (public):** list, filters, detail, availability, keyword search (F-10, 11, 13).
5. **Booking engine:** slot validation, atomic double-booking prevention, lifecycle, my-bookings (F-20..23, SEC-16).
6. **Projects & requests & approvals:** F-30, 31, 33, notifications F-50.
7. **Conflict detection + allocation recommender + explanations + alternatives + override:** F-40..44, 47, audit (SEC-19).
8. **AI layer:** NL search (F-12) and explanation phrasing with schema validation + fallback + rate limits; label AI vs rules.
9. **In-charge tools:** equipment CRUD, maintenance, check-in/out (F-14, F-26, F-46).
10. **Admin:** users, policy, analytics (F-45, F-60, F-70).
11. **Hardening pass:** SEC-01..20 checklist, `npm audit`, axe fixes, UX state review.
12. **Tests to targets**, README completion, Cloud Run deploy, smoke-test live URL.
13. **P1/P2 extras** only if time remains.

---

## 15. Definition of Done / Pre-Submission Checklist

- [ ] `npm run verify` passes (lint, typecheck, tests, build)
- [ ] `npm run test:e2e` passes against the local production build
- [ ] Guest can browse, search and view availability with no login
- [ ] Protected action triggers inline login and resumes the action
- [ ] All SEC-01..20 verified (tests or documented checks)
- [ ] A11Y checks pass (axe: no critical/serious); keyboard-only run-through done
- [ ] Demo conflict scenario shows an explained recommendation + alternatives
- [ ] App works with **no** `GEMINI_API_KEY` (fallback) and with a key
- [ ] `.env.example` present; no secrets in repo/history; `npm audit` has no high/critical
- [ ] Repo: public, one branch, `.git` URL, < 10 MB
- [ ] Cloud Run URL live, `/api/health` 200, demo logins work, tested from an incognito window
- [ ] README complete; LinkedIn post drafted and linked

---

## 16. Risks

| Risk | Mitigation |
|---|---|
| Scope too large | P0 first, strictly in Section 14 order |
| AI latency/outage/missing key | Fallback everywhere, 8 s timeout |
| SQLite data resets on redeploy/restart; multiple Cloud Run instances would each hold a separate DB | Deploy with `min=max=1` instance; seed on boot is idempotent and rich; repository layer allows Cloud SQL swap; acceptable for demo |
| Demo credentials as attack surface | Flag-gated, constrained demo-Admin (SEC-17) |
| Only 2 attempts, latest counts | Complete Section 15 before each submission |
| Repo > 10 MB | Tiny assets, strict `.gitignore`, check `du` before submit |
