# ARCHITECTURE.md — LabLink

> Authoritative technical design. Requirements live in `PRD.md`; hard rules in `RULES.md`; build order in `PHASES.md`; UI in `DESIGN.md`.
> If code and this file disagree, fix the code or update this file and log it in `MEMORY.md` (Decisions).

---

## 1. Principles
1. **One deployable.** A single Next.js app contains UI and backend. No separate server, no microservices.
2. **Layered backend** with strict one-way dependencies (see §3). Business logic is never in route handlers or components.
3. **Pure core.** Booking rules and the allocation engine are pure functions (no DB, no AI, no `Date.now()`); easy to test.
4. **AI is an accessory.** Everything works without it. AI output is validated and can only choose among candidates the backend supplies.
5. **Secure by construction.** One API wrapper enforces rate-limit → origin check → session → role → validation → handler, so no route can forget a control.
6. **Zero-config run.** `npm install && npm run dev` works with no `.env`, no API key, no external services.

---

## 2. Is a backend needed? Yes — and it lives inside Next.js

| Need | Where it is implemented |
|---|---|
| REST API, auth, sessions, RBAC, validation | Next.js **Route Handlers** (`src/app/api/**/route.ts`) wrapped by `apiHandler` |
| Business logic | **Services** (`src/services/*`) |
| Data access | **Repositories** (`src/lib/db/repositories/*`) over `better-sqlite3` |
| Pure rules (conflicts, scoring, slot math) | `src/lib/booking`, `src/lib/allocation` |
| Gemini calls | `src/lib/ai` only |
| Background jobs | **None.** Time-based effects (no-show release, expiry) are applied lazily on read via `sweepExpired()` |
| Real-time | **None.** Notifications are fetched on page load, window focus, and a 60 s poll |

Server Components may call **services** directly (faster than HTTP); they must still call the same auth guards. Client Components call `/api/*`.

---

## 3. System Context & Layers

```
 Browser (Guest / Student / Faculty / In-charge / Admin)
      │  HTTPS
      ▼
┌────────────────────────── Google Cloud Run (1 instance) ──────────────────────────┐
│  Next.js 15 (Node 22)                                                              │
│                                                                                    │
│  src/middleware.ts ── security headers + CSP nonce + request id                    │
│                                                                                    │
│  UI: Server/Client Components ──────────────┐                                      │
│                                             │ (server-side direct call)            │
│  API: Route Handler ── apiHandler() ────────┤                                      │
│        1 rateLimit  2 originCheck           ▼                                      │
│        3 session    4 requireRole     ┌───────────┐   ┌──────────────────────┐    │
│        5 zod parse  6 handler  ─────► │ Services  │──►│ lib/allocation (pure)│    │
│        7 error map  8 respond         │ (use-case │   │ lib/booking (pure)   │    │
│                                       │  logic)   │──►│ lib/ai (Gemini+fallbk)│───┼──► Gemini API
│                                       └─────┬─────┘   └──────────────────────┘    │   (optional)
│                                             ▼                                      │
│                                   Repositories (SQL) ──► SQLite file (WAL)        │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Dependency rule (enforced by ESLint `no-restricted-imports`):**
`app/components → services → repositories → db` and `services → lib/{allocation,booking,ai,security}`.
- `lib/allocation` and `lib/booking` import nothing from `db`, `ai`, `services`, or Next.
- Repositories never import services. Only `src/lib/db/**` may import `better-sqlite3`. Only `src/lib/ai/**` may import `@google/genai`.

---

## 4. Tech Stack

Use the **latest stable** at scaffold time, pin exact versions in `package.json`, commit `package-lock.json`, never upgrade mid-project.

| Layer | Choice |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 (`strict`) |
| Styling | Tailwind CSS 3.4 + CSS variables (tokens in `DESIGN.md`) |
| UI primitives | `@radix-ui/react-dialog` (+ others only if needed), `lucide-react` icons |
| Validation | `zod` |
| DB | `better-sqlite3` (synchronous, WAL, foreign keys ON), hand-written SQL, **no ORM** |
| Auth | Own sessions; `bcryptjs` (cost 12); `node:crypto` for ids/hashes |
| AI | `@google/genai` (Gemini), JSON-schema output |
| Dates | Native `Intl` + fixed campus offset (IST = UTC+05:30, no DST); **no date library** |
| Tests | `vitest`, `@playwright/test`, `@axe-core/playwright` |
| Quality | `eslint` (+ `eslint-config-next`), `prettier`, `tsc --noEmit` |
| Deploy | Docker (multi-stage, non-root) → Cloud Run |

Anything not listed requires an entry in `MEMORY.md → Decisions` and must pass `RULES.md §3`.

---

## 5. App Flow

### 5.1 Page map
| Route | Access | Purpose |
|---|---|---|
| `/` | Guest | Hero search box (AI/keyword), featured categories, how it works |
| `/equipment` | Guest | Catalogue: search, filters, sort, pagination |
| `/equipment/[id]` | Guest | Details, 14-day availability, slot picker, "Book" |
| `/how-it-works` | Guest | 4-step explainer, fairness policy in plain words |
| `/login`, `/signup` | Guest only | Auth (also shown as a modal for just-in-time auth) |
| `/bookings` | Student+ | My bookings and requests, statuses, cancel/modify |
| `/projects`, `/projects/new`, `/projects/[id]` | Student+ | Projects and team |
| `/notifications` | Any user | Notification list |
| `/approvals` | Faculty, Admin | Pending requests for my students |
| `/conflicts`, `/conflicts/[id]` | In-charge, Admin | Open conflict groups and AI/rule recommendation |
| `/lab`, `/lab/equipment/new`, `/lab/equipment/[id]/edit` | In-charge, Admin | Manage equipment, maintenance, check-in |
| `/admin/users`, `/admin/policy`, `/admin/analytics`, `/admin/audit` | Admin | Oversight |

### 5.2 Flow A — Discover → Book (Guest-first, just-in-time auth)
```
Guest opens /equipment → searches ("BLE dev board") → POST /api/search/ai (public, rate-limited)
  → opens /equipment/:id → GET availability → picks slot (kept in client state + sessionStorage draft)
  → clicks "Book"
       ├─ has session → POST /api/bookings
       └─ no session  → AuthDialog "Sign in to confirm" (shows equipment + slot)
                          → login/signup → session cookie → resume draft → POST /api/bookings
  → server (bookingService.create), in one DB transaction:
       validate window rules → check blocking overlap
         ├─ clash → 409 SLOT_TAKEN + alternatives (free slots / similar equipment)
         ├─ equipment.access_type = open      → status `approved`            (confirmed)
         └─ equipment.access_type = approval  → status `pending_approval`    (request) + notify faculty guide
  → UI shows confirmation with next steps
```

### 5.3 Flow B — Approval
```
Student creates Project (guide = faculty) → requests restricted equipment (booking in pending_approval)
Faculty /approvals → approve | reject | request changes (+comment)
   approve → `faculty_approved` → if equipment.requires_incharge_approval: wait for in-charge approve
          → tryConfirm(booking)   (see §6.2)
```

### 5.4 Flow C — Conflict resolution (core differentiator)
```
Two+ eligible bookings overlap on one equipment → ConflictGroup (status open), in-charge notified
In-charge opens /conflicts/:id
   → conflictService.getRecommendation(): engine ranks (pure) → AI phrases reasons (optional) 
   → UI: ranked table, factor bars, plain-language reasons, alternatives for losers
   → Accept   → winners `approved`, losers `displaced` (+ alternatives in notification)
   → Override → choose different non-overlapping winners + required reason → audited
Losers: one-click "Request alternative" prefilled from suggestion
```

### 5.5 Flow D — Maintenance
```
In-charge marks MaintenanceBlock → system finds `approved` bookings overlapping → 
  proposes reschedule/substitute per booking → in-charge confirms → users notified with reasons
```

---

## 6. Core Domain Logic

### 6.1 Time & slots
- Store all instants as UTC ISO-8601 strings. Campus timezone constant `CAMPUS_UTC_OFFSET_MIN = 330`.
- Slot granularity **30 minutes**; start/end must align; duration ∈ [30 min, `max_booking_minutes`]; within opening hours/weekdays (default Mon–Sat 09:00–18:00 IST); not in the past; ≤ `advance_days` ahead (default 14).
- Overlap predicate (half-open intervals): `a.start < b.end && a.end > b.start`. Adjacent slots do **not** overlap.

### 6.2 Booking state machine

| From | Event | To | Actor |
|---|---|---|---|
| — | create, open equipment, no blocking overlap | `approved` | Student |
| — | create, approval equipment | `pending_approval` | Student |
| `pending_approval` | faculty approve | `faculty_approved` | Faculty/Admin |
| `pending_approval` | faculty reject | `rejected` | Faculty/Admin |
| `pending_approval` | faculty request changes | `changes_requested` | Faculty/Admin |
| `changes_requested` | owner edits & resubmits | `pending_approval` | Owner |
| `faculty_approved` | in-charge approve (restricted only) | `faculty_approved` + `incharge_approved_at` | In-charge/Admin |
| `faculty_approved` | `tryConfirm` ok | `approved` | System |
| `faculty_approved` | `tryConfirm` blocked by confirmed booking/maintenance | `displaced` | System |
| `faculty_approved` | in-charge reject | `rejected` | In-charge/Admin |
| `faculty_approved` | conflict resolved: loser | `displaced` | System/In-charge |
| `approved` | check-in | `checked_in` | In-charge |
| `checked_in` | check-out | `completed` | In-charge |
| `approved` | start + grace (15 min) without check-in | `no_show` | System (lazy sweep) |
| `pending_approval`, `changes_requested`, `faculty_approved`, `approved` | cancel | `cancelled` | Owner/Admin |

Terminal: `completed`, `rejected`, `cancelled`, `no_show`, `displaced`. Any other transition → `INVALID_TRANSITION` (409). Every transition writes an audit row.

**Blocking set:** `approved`, `checked_in` + maintenance blocks.
**Competing set:** `pending_approval`, `faculty_approved` (soft holds; they do **not** block each other).
Atomic confirm/create uses `db.transaction(...).immediate()` and re-checks overlap **inside** the transaction.

**`tryConfirm(booking)`** (inside one transaction):
1. If it overlaps the blocking set → `displaced`, notify with alternatives.
2. Else if it is not yet cleared (restricted equipment without in-charge approval) → stay `faculty_approved`.
3. Else find overlapping *competing* bookings (excluding itself):
   - none → `approved`;
   - some → create/attach `ConflictGroup`, keep `faculty_approved`, notify in-charge.

### 6.3 Allocation engine (`src/lib/allocation`, pure)

Input: eligible competing bookings (`faculty_approved` and cleared), context per booking (project deadline, priority, hours used in last 14 d, no-show count in last 60 d, `created_at`), policy weights, `now`.

Factors (each normalised to 0–1, higher = stronger claim):

| Factor | Formula |
|---|---|
| `deadline` | `1 − clamp(daysToDeadline / 14, 0, 1)` (no deadline → 0) |
| `priority` | normal 0 · high 0.5 · critical 1 |
| `fairShare` | `1 − clamp(hoursUsed14d / (2 × weeklyQuotaHours), 0, 1)` |
| `waiting` | `clamp(hoursSinceSubmit / 72, 0, 1)` |
| `reliability` | `max(0, 1 − 0.25 × noShows60d)` |

`score = Σ weight_i × factor_i` (default weights: deadline 0.30, priority 0.25, fairShare 0.25, waiting 0.10, reliability 0.10; must sum to 1 ± 0.001). `weeklyQuotaHours` default 8. Round to 3 decimals.

Algorithm:
1. Sort by `score` desc; tie-break `created_at` asc, then `id` asc (fully deterministic).
2. Greedy: accept a booking if it overlaps none already accepted; else mark displaced.
3. For each displaced booking compute up to 3 **alternatives**, ordered by closeness to the original start:
   a. next free window of the same duration within 7 days (and before project deadline if any);
   b. equivalent equipment: same category, tag Jaccard ≥ 0.4, free in the same window, any lab;
   c. shorter overlapping window if it fits.
4. Output per booking: `rank, score, factors, outcome, reasonText` (deterministic template quoting the top 2 contributing factors with real numbers), `alternatives[]`.

Example template: `"Ranked #1: project deadline in 3 days and only 2 h of lab time used in the last 2 weeks (vs 9 h for the next request)."`

### 6.4 Conflict resolution rules
- Recommendation is **advisory**; only an In-charge/Admin action changes statuses.
- Accept → winners `approved`, losers `displaced`, group `resolved`. Override → In-charge picks winners (no overlaps allowed, validated server-side) and **must** give a reason (10–500 chars). Both audited with the recommendation snapshot.
- Competing bookings still `pending_approval` are shown as "awaiting approval" and are re-checked against the new confirmed booking when later approved.

---

## 7. AI Layer (`src/lib/ai`)

```
ai/
  client.ts      generateJson<T>(prompt, schema, {timeoutMs}) – only file importing @google/genai
  prompts.ts     versioned prompt templates (system rules + delimited data blocks)
  schemas.ts     zod schemas for every AI response
  search.ts      aiSearch(query, candidates) + keywordSearch(query, catalogue) fallback
  explain.ts     phraseReasons(decisions) + template fallback
  draft.ts       draftJustification(project, equipment) + template fallback
  alternatives.ts rankAlternatives(candidates) + rule-based fallback   (P1)
  fallback.ts    shared helpers; isAiEnabled()
```

**Contract for every AI function:** `(validatedInput) → { result, source: 'ai' | 'rules' }`. Never throws to callers; on timeout (8 s), missing key, non-JSON, or schema mismatch it returns the rule-based result with `source: 'rules'`.

| Feature | Backend supplies | Gemini may | Validation |
|---|---|---|---|
| NL search (F-12) | ≤ 20 candidates from keyword/tag retrieval | Re-rank and write a ≤ 140-char reason per pick | Every returned `id` ∈ candidate ids; ≤ 10 items; reasons plain text |
| Reasons (F-42) | Engine decisions with factor numbers | Rewrite template into 1–2 friendly sentences | ≤ 280 chars; stored in `ai_reason_text`; template always stored in `reason_text` |
| Draft (F-32) | Project title/description, equipment name | Draft a ≤ 600-char justification | Plain text only; user edits before submit |
| Alternatives (F-15/43) | Engine-computed candidate list | Order/describe | Subset check |

Caching: in-memory LRU, 5 min TTL, keyed by normalised input. Rate limits: 20 AI calls / 10 min / IP (guest), 60 / 10 min / user.

---

## 8. Data Model (SQLite)

Conventions: `id TEXT` (UUIDv4 via `crypto.randomUUID()`), timestamps UTC ISO text, `CHECK` constraints for enums, `PRAGMA foreign_keys=ON`, `journal_mode=WAL`.

```sql
users(id PK, name, email UNIQUE COLLATE NOCASE, password_hash, role CHECK(role IN ('student','faculty','incharge','admin')),
      department_id FK, faculty_guide_id FK→users NULL, status CHECK(status IN ('active','disabled')), created_at, updated_at)
departments(id PK, name, code UNIQUE)
labs(id PK, name, department_id FK, location, in_charge_id FK→users)
equipment(id PK, name, category, tags JSON, specs JSON, lab_id FK, status CHECK(status IN ('available','maintenance','retired')),
          access_type CHECK(access_type IN ('open','approval','dept_only')), requires_incharge_approval INT DEFAULT 0,
          max_booking_minutes INT, advance_days INT, open_time, close_time, weekdays JSON, image_path, created_at, updated_at)
projects(id PK, title, description, owner_id FK, guide_id FK, deadline, priority CHECK(priority IN ('normal','high','critical')), status, created_at, updated_at)
project_members(project_id FK, user_id FK, PRIMARY KEY(project_id,user_id))
bookings(id PK, equipment_id FK, user_id FK, project_id FK NULL, start_at, end_at,
         status CHECK(status IN ('pending_approval','changes_requested','faculty_approved','approved','checked_in','completed','rejected','cancelled','no_show','displaced')),
         justification, decision_note, incharge_approved_at NULL, conflict_group_id FK NULL, checked_in_at NULL, created_at, updated_at)
maintenance_blocks(id PK, equipment_id FK, start_at, end_at, reason, created_by FK)
conflict_groups(id PK, equipment_id FK, window_start, window_end, status CHECK(status IN ('open','resolved')), resolved_by NULL, resolved_at NULL, created_at)
allocation_decisions(id PK, conflict_group_id FK, booking_id FK, rank INT, score REAL, factors JSON, reason_text, ai_reason_text NULL,
                     source CHECK(source IN ('rules','ai_assisted')), recommended_outcome, final_outcome NULL, overridden_by NULL, override_reason NULL, created_at)
notifications(id PK, user_id FK, type, title, body, link NULL, read_at NULL, created_at)
audit_log(id PK, actor_id NULL, action, entity, entity_id, metadata JSON, ip_hash NULL, created_at)   -- append-only: no UPDATE/DELETE in code
sessions(id_hash PK, user_id FK, created_at, last_seen_at, expires_at)
policy_config(id INT PK CHECK(id=1), weights JSON, weekly_quota_hours REAL, version INT, updated_by NULL, updated_at)
```

Indexes (required): `bookings(equipment_id, start_at, end_at)`, `bookings(user_id, status)`, `bookings(status, start_at)`, `equipment(lab_id)`, `equipment(category)`, `notifications(user_id, read_at)`, `audit_log(created_at)`, `sessions(user_id)`, `maintenance_blocks(equipment_id, start_at, end_at)`.

Migrations: single `src/lib/db/schema.sql` applied idempotently (`CREATE TABLE IF NOT EXISTS`) with a `schema_version` pragma/table. Seed runs only if `departments` is empty.

---

## 9. Security Architecture (maps to `SEC-*`)

**`apiHandler` pipeline** (`src/lib/security/api-handler.ts`):
1. Request id (`x-request-id`)
2. Rate limit (named bucket; in-memory sliding window — valid because we run exactly 1 instance)
3. Origin check for non-GET (`Origin`/`Host` must match `APP_URL`/host) + require `application/json`
4. Session load (cookie `lablink_sid` → sha256 → `sessions` row; check expiry; sliding idle refresh)
5. Authorisation: `auth: 'public' | 'user' | { roles: [...] }`
6. Zod parse of `params`, `query`, `body` (`.strict()`)
7. Handler → returns data
8. Error mapper (`AppError` → HTTP; unknown → 500 generic) and `{ data }` / `{ error }` envelope

**Sessions:** 32 random bytes (base64url) in cookie `HttpOnly; Secure(prod); SameSite=Lax; Path=/`; DB stores only sha256. Idle 2 h, absolute 7 d, rotated on login, deleted on logout/password change.

**CSP** (middleware, per-request nonce): `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. Plus nosniff, Referrer-Policy `strict-origin-when-cross-origin`, Permissions-Policy (deny camera/mic/geo), HSTS in prod.

**Ownership checks** live in services via `assertCanAccessBooking(actor, booking)` etc. (anti-IDOR). Not-found and forbidden for foreign objects both return 404 to avoid enumeration.

---

## 10. Folders & Files

```
lablink/
├─ AGENTS.md  CLAUDE.md  GEMINI.md
├─ PRD.md  ARCHITECTURE.md  RULES.md  PHASES.md  DESIGN.md  MEMORY.md
├─ README.md                      quick start, demo logins, env table, tests, deploy, security + a11y notes
├─ package.json  package-lock.json  tsconfig.json  next.config.ts  tailwind.config.ts  postcss.config.mjs
├─ eslint.config.mjs  .prettierrc  vitest.config.ts  playwright.config.ts
├─ Dockerfile  .dockerignore  .gitignore  .env.example
├─ public/
│  └─ equipment/*.svg             tiny category illustrations (≤ 50 KB each), favicon
├─ scripts/
│  ├─ seed.ts                     `npm run seed`
│  └─ check-repo-size.mjs         fails if repo > 9 MB
├─ docs/DECISIONS.md              ambiguity decisions (optional; MEMORY.md is primary)
├─ src/
│  ├─ middleware.ts               CSP nonce, security headers, request id
│  ├─ app/
│  │  ├─ layout.tsx  page.tsx  globals.css  error.tsx  not-found.tsx  loading.tsx
│  │  ├─ (public)/equipment/page.tsx  equipment/[id]/page.tsx  how-it-works/page.tsx
│  │  ├─ (auth)/login/page.tsx  signup/page.tsx
│  │  ├─ (app)/bookings/page.tsx  projects/page.tsx  projects/new/page.tsx  projects/[id]/page.tsx  notifications/page.tsx
│  │  ├─ (staff)/approvals/page.tsx  conflicts/page.tsx  conflicts/[id]/page.tsx
│  │  │          lab/page.tsx  lab/equipment/new/page.tsx  lab/equipment/[id]/edit/page.tsx
│  │  ├─ (admin)/admin/users/page.tsx  policy/page.tsx  analytics/page.tsx  audit/page.tsx
│  │  └─ api/
│  │     ├─ health/route.ts
│  │     ├─ auth/{signup,login,logout,me,demo}/route.ts
│  │     ├─ equipment/route.ts  equipment/[id]/route.ts  equipment/[id]/availability/route.ts  equipment/[id]/maintenance/route.ts
│  │     ├─ search/ai/route.ts
│  │     ├─ projects/route.ts  projects/[id]/route.ts
│  │     ├─ bookings/route.ts  bookings/[id]/route.ts  bookings/[id]/check-in/route.ts  bookings/[id]/check-out/route.ts
│  │     ├─ approvals/route.ts  approvals/[id]/decision/route.ts
│  │     ├─ conflicts/route.ts  conflicts/[id]/route.ts  conflicts/[id]/resolve/route.ts
│  │     ├─ notifications/route.ts  notifications/[id]/read/route.ts
│  │     └─ admin/{users,policy,analytics,audit}/route.ts
│  ├─ components/
│  │  ├─ ui/            Button, Input, Select, Textarea, Badge, Card, Dialog, Toast, Skeleton, EmptyState, Table, Tabs
│  │  ├─ layout/        Header, Footer, Nav, SkipLink, PageHeader
│  │  ├─ auth/          AuthDialog, LoginForm, SignupForm, DemoLogin
│  │  ├─ equipment/     EquipmentCard, EquipmentFilters, SearchBox, AiResults, AvailabilityGrid, SlotPicker
│  │  ├─ booking/       BookingForm, BookingList, StatusBadge, ConfirmPanel
│  │  ├─ projects/      ProjectForm, ProjectCard
│  │  ├─ conflicts/     ConflictTable, FactorBars, AlternativeList, OverrideDialog
│  │  └─ admin/         UtilisationChart (with table twin), PolicyForm, AuditTable
│  ├─ services/         auth, equipment, booking, project, approval, conflict, notification, analytics, admin, audit, search  (*.service.ts)
│  ├─ lib/
│  │  ├─ config.ts      zod-validated env, typed `config`
│  │  ├─ errors.ts      AppError + subclasses, error codes
│  │  ├─ logger.ts      JSON logger with redaction
│  │  ├─ auth/          session.ts  password.ts  guards.ts  demo.ts  password-policy.ts
│  │  ├─ booking/       time.ts  slots.ts  overlap.ts  transitions.ts  rules.ts
│  │  ├─ allocation/    factors.ts  score.ts  allocate.ts  alternatives.ts  explain-template.ts  types.ts
│  │  ├─ ai/            (see §7)
│  │  ├─ db/            client.ts  schema.sql  migrate.ts  seed-data.ts  repositories/*.repo.ts
│  │  ├─ security/      api-handler.ts  rate-limit.ts  origin.ts  headers.ts  sanitize.ts  request-id.ts
│  │  ├─ validation/    schemas shared by API and forms (auth, booking, project, equipment, policy, common)
│  │  └─ utils/         cache.ts (LRU)  format.ts  ids.ts
│  └─ types/            domain.ts (inferred from zod + DB row mappers)
└─ tests/
   ├─ unit/             allocation, booking (time/slots/overlap/transitions), validation, password-policy, rate-limit, ai-fallbacks
   ├─ integration/      auth, rbac-matrix, idor, booking-concurrency, approval-flow, conflict-flow, ai-endpoint (mocked)
   ├─ e2e/              smoke.spec.ts, a11y.spec.ts
   └─ helpers/          test-db.ts (in-memory DB + seed), factories.ts, auth-helpers.ts
```

Size limits: file ≤ 300 lines, function ≤ 40 lines (split otherwise).

---

## 11. Configuration (`src/lib/config.ts`, validated by zod)

| Var | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `APP_URL` | `http://localhost:3000` | Used for origin check; set to Cloud Run URL in prod |
| `DATABASE_PATH` | `./data/lablink.db` | Cloud Run: `/tmp/lablink.db` |
| `SESSION_SECRET` | dev-only random at boot | Required in prod (≥ 32 chars) |
| `DEMO_MODE` | `false` | `true` in hackathon deployment |
| `GEMINI_API_KEY` | _(empty)_ | Empty ⇒ rule-based fallbacks |
| `GEMINI_MODEL` | set in `config.ts` | Verify current model id in Gemini docs at build time |
| `AI_TIMEOUT_MS` | `8000` | |
| `LOG_LEVEL` | `info` | |

`.env.example` lists names with fake values. Prod config validation fails fast if `SESSION_SECRET` is missing/short.

---

## 12. Deployment (Cloud Run)

- **Dockerfile:** stage 1 `deps` (`npm ci`), stage 2 `build` (`next build`, `output: 'standalone'`), stage 3 `runner` (`node:22-slim`, non-root user, copy standalone + `src/lib/db/schema.sql` + `public`, `EXPOSE 8080`, `ENV PORT=8080`).
- **Instances:** `--min-instances=1 --max-instances=1`. Required because SQLite lives on the instance's local disk and the rate limiter/cache are in-memory; this also prevents the scale-to-zero reset. Data still resets on redeploy/restart → seed is idempotent and demo data is rich enough.
- **Command (example):**
  `gcloud run deploy lablink --source . --region asia-south1 --allow-unauthenticated --min-instances=1 --max-instances=1 --set-env-vars NODE_ENV=production,DEMO_MODE=true,APP_URL=<service-url> --set-secrets SESSION_SECRET=...,GEMINI_API_KEY=...`
- **Health:** `GET /api/health` → `{ "status": "ok", "version": "x.y.z" }`.
- **Post-deploy smoke test:** health 200 → open `/equipment` as Guest → demo login → create booking.

---

## 13. Performance & Observability
- In-memory LRU for catalogue reads (TTL 30 s, invalidated on equipment mutation) and AI results (5 min).
- All list endpoints paginated (`pageSize ≤ 50`); availability computed in one query per equipment per window; no N+1 (use joins/IN queries).
- Static assets cached; images are tiny SVG/WebP; route-level code splitting by default; lazy-load admin charts.
- Structured JSON logs to stdout (`level, msg, requestId, route, status, ms`), with redaction of `password`, `token`, cookies, emails.

---

## 14. Known Limitations (documented, accepted)
- Single instance, ephemeral SQLite (swap path: replace `repositories/*` with Cloud SQL/Firestore implementations).
- No email in MVP (flag exists for P1).
- No real-time push (poll only).
- Self-signup has no email verification (low-risk: student role only).
