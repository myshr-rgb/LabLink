# DESIGN.md — LabLink Design System

> Goal: **minimalist, instantly understandable, fast, accessible to everyone.** If a screen needs explaining, simplify it.
> Targets: WCAG 2.1 AA, mobile-first (≥ 360 px), usable by first-time students with zero training.

---

## 1. Principles
1. **One primary action per screen.** Everything else is secondary or hidden.
2. **Show, don't make me hunt.** Search first; availability visible at a glance.
3. **Plain language.** "Book this slot", not "Submit reservation request". No jargon; explain AI/fairness in a sentence.
4. **Calm UI.** Neutral greys, one accent, generous whitespace, no decoration for its own sake.
5. **Never colour alone.** Every status has text + icon.
6. **Fast by default.** System fonts, tiny SVGs, no heavy libraries, no layout shift.
7. **Forgiving.** Confirm before irreversible actions; easy undo/cancel; preserve inputs on error and login.

---

## 2. Design Tokens (CSS variables in `globals.css`, mapped in `tailwind.config.ts`)

### Colour (light)
| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| `--bg` | `#FFFFFF` | Page | — |
| `--surface` | `#F8FAFC` | Cards, panels, table stripes | — |
| `--border` | `#E2E8F0` | Dividers, input borders (use `--border-strong` `#94A3B8` for inputs) | — |
| `--text` | `#0F172A` | Body, headings | 17:1 |
| `--text-muted` | `#475569` | Secondary text | 7.6:1 |
| `--accent` | `#0F766E` | Primary buttons, links, focus | 5.5:1 |
| `--accent-hover` | `#115E59` | Hover/active | 7.6:1 |
| `--accent-soft` | `#F0FDFA` | Selected/hover backgrounds | — |
| `--success` | `#15803D` | Approved, free | 5.0:1 |
| `--warning` | `#B45309` | Pending, awaiting | 5.0:1 |
| `--danger` | `#B91C1C` | Rejected, errors | 6.5:1 |
| `--info` | `#1D4ED8` | AI-assisted label, info | 6.7:1 |

Rules: text on `--accent` is white. Soft tints (`success/warning/danger/info` at ~10% on white) may be used as badge backgrounds **only** with the full-strength colour for text. Dark theme is P2: redefine the same tokens under `[data-theme="dark"]` / `prefers-color-scheme`.

### Typography
- Font: **system stack** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (no web-font downloads).
- Scale (px / line-height): 12/16 caption · 14/20 small · **16/24 body** · 18/28 lead · 20/28 h3 · 24/32 h2 · 32/40 h1 (desktop), 28/36 (mobile).
- Weights: 400 body, 500 labels/buttons, 600 headings. Max line length ~70ch.

### Space, shape, elevation
- 4 px grid: 4, 8, 12, 16, 24, 32, 48, 64. Page gutter 16 px (mobile) / 24 px (desktop); max content width 1120 px.
- Radius: 8 px controls, 12 px cards/dialogs, full for pills/badges.
- Elevation: borders first; one soft shadow (`0 1px 2px rgb(0 0 0 / 0.06)`) for cards; `0 8px 24px rgb(0 0 0 / 0.12)` for dialogs only.
- Motion: 150 ms ease-out for hover/focus/dialog; **none** when `prefers-reduced-motion`.
- Focus: 2 px `--accent` ring with 2 px white offset on every interactive element, never removed.

---

## 3. Layout
- **Header (sticky):** logo "LabLink" · primary nav (Equipment, How it works; role links appear after login: My bookings, Approvals, Conflicts, Lab, Admin) · search icon (mobile) · notifications bell · **Sign in / Sign up** (Guest) or user menu.
- Mobile: header collapses to logo + menu button (dialog nav); bottom spacing for thumb reach; single column.
- Desktop: content centred (max 1120), filters as left column (240 px) on `/equipment`.
- **Skip-to-content** link first in DOM. Landmarks: `header`, `nav`, `main`, `footer`. One `h1` per page. Breadcrumbs on detail pages.
- Footer: short, links to How it works and a one-line "Built for campus labs".

---

## 4. Key Screens (wireframes)

### 4.1 Home
```
[Header]
  Find the lab equipment you need
  Describe your project or search by name.
  [ e.g. “a board to prototype a BLE sensor”        ] [Search]
  Popular:  (FPGA boards) (3D printers) (Oscilloscopes) (GPU workstations)

  How it works      1 Find → 2 Pick a slot → 3 Get approved → 4 Use it
  Fair by design    One short paragraph on deadlines + fair share.
```

### 4.2 Catalogue `/equipment`
```
Equipment                                         Sort: [Best match v]
┌ Filters ──────┐  ┌ Card ─────────────┐ ┌ Card ─────────────┐
│ Department    │  │ [img] Name        │ │ ...               │
│ Category      │  │ Lab · Dept        │ └───────────────────┘
│ Available on  │  │ ● Available       │  ... pagination
│ Access type   │  │ [View]            │
└───────────────┘  └───────────────────┘
```
Card: image (SVG), name, lab/department, status badge (text+icon), access badge ("Open" / "Needs approval"), single action "View".

### 4.3 Equipment detail + booking
```
Home › Equipment › Name
Name                         [● Available] [Needs faculty approval]
Short description · specs table (collapsible on mobile)

Choose a time (next 14 days)     < Tue 24 Nov  Wed 25 ... >
 09:00 [free] 09:30 [free] 10:00 [taken] ...   (list view toggle)
Selected: Tue 24 Nov, 10:00–11:00 (1 h)
[ Book this slot ]            ← primary; if Guest → AuthDialog
```
Slot buttons: free = outlined, selected = filled accent, taken = disabled with text "Taken", maintenance = "Unavailable". Multi-slot range by selecting start then end. Provide a "List view" toggle for screen-reader/keyboard users and small screens.

### 4.4 Request flow (approval equipment)
Short form: Project (select or "Create new"), Purpose (textarea with **Suggest wording** button; shows "AI-assisted" or "Rule-based"), time summary, [Send request]. After send: confirmation with "What happens next" (3 bullet steps).

### 4.5 My bookings
Tabs: Upcoming · Pending · Past. Row: equipment, time, status badge, actions (Cancel, Modify). Empty state with "Find equipment" button.

### 4.6 Approvals (Faculty)
Table/cards: student, equipment, time, project + deadline, justification. Actions: **Approve** (primary), Request changes, Reject (requires comment). Keyboard-friendly, bulk not required.

### 4.7 Conflict resolution (In-charge) — the showcase screen
```
Conflict: FPGA Board A · Fri 2–4 pm        [AI-assisted] or [Rule-based]
Recommendation
 #1 Team A   Score 0.82  ▮▮▮▮▮▮▮▯ deadline  ▮▮▮▮▯ fair share …
    "Demo in 3 days; only 2 h used in the last 2 weeks (vs 9 h)."   ✓ Gets the slot
 #2 Team B   Score 0.54  …   ✗ Not allocated → Alternatives: Sat 10–12 · FPGA Board B (ECE Lab)
 #3 …
[ Accept recommendation ]  [ Choose differently… ]  (override needs a reason)
Awaiting approval: 1 request (shown, not ranked)
```
Factor bars always have numeric text. Plain reasons come first; numbers second.

### 4.8 Admin analytics
Three headline numbers (utilisation %, idle items, open conflicts) → bar chart (peak hours) → "Most requested" list. Every chart has a table twin (toggle "View as table").

---

## 5. Auth UX (Guest-first)
- No login wall. "Sign in" / "Sign up" in header only.
- Just-in-time `AuthDialog` appears on protected actions with a one-line context: "Sign in to confirm Tue 10:00–11:00 on Oscilloscope X". After success the **action resumes**; drafts survive (sessionStorage).
- Signup: 3 fields (name, email, password) + optional department. Inline password hint ("At least 10 characters"). Show/hide password toggle. No CAPTCHA.
- Login screen with a clearly separated **"Try a demo account"** group (Student / Faculty / In-charge / Admin) when `DEMO_MODE`.

---

## 6. Components (spec)
| Component | Notes |
|---|---|
| **Button** | Variants: primary (accent), secondary (outline), ghost, danger. Min height 44 px. Loading state shows spinner + keeps width + `aria-busy`. |
| **Input / Select / Textarea** | Visible `<label>` above; helper text below; error text in `--danger` with icon, linked via `aria-describedby`; 16 px font (prevents mobile zoom). |
| **Badge (status)** | Icon + text. Booking: Pending (clock, warning) · Approved (check, success) · Rejected (x, danger) · Displaced (shuffle, warning) · Cancelled (slash, muted) · Completed (check-circle, muted) · Checked in (log-in, info). |
| **Card** | Border + subtle shadow, 12 px radius, whole card not a link unless single clear action. |
| **Dialog** | Radix Dialog: focus trap, ESC closes, returns focus, labelled title. |
| **Toast** | Bottom-centre, `role="status"`, auto-dismiss 5 s (errors persist until dismissed), never the only place an error appears. |
| **Table** | Real `<table>` with `<th scope>`; collapses to stacked cards < 640 px. |
| **SlotPicker** | Grid of buttons with `aria-pressed`; arrow-key navigation; list-view alternative. |
| **Skeleton / EmptyState / ErrorState** | Every data view uses all three; EmptyState has a helpful next action; ErrorState has Retry. |

Icons: `lucide-react`, 20 px, `aria-hidden` unless standalone (then labelled).

---

## 7. Accessibility Checklist (build-time)
- Semantic HTML first; ARIA only to fill gaps. Heading order logical.
- All functionality keyboard-operable; tab order = visual order; visible focus; no traps; Esc closes overlays.
- Contrast ≥ 4.5:1 text, ≥ 3:1 UI/graphics; text resizes to 200% without loss; layout reflows at 320 px.
- Touch targets ≥ 44×44 px.
- Forms: labels, `autocomplete` attributes (`name`, `email`, `current-password`, `new-password`), error summary `role="alert"`, focus moves to first error.
- Live regions (`aria-live="polite"`) for AI search results, toasts, notification count.
- Images `alt` (decorative → `alt=""`); charts have a data table alternative.
- `prefers-reduced-motion` respected; no auto-playing media; no time limits without warning.
- `lang="en"` on `<html>`; document titles unique per page ("Equipment · LabLink").
- Stable `data-testid` on: search input, filters, slot buttons, Book/Send buttons, auth dialog, approve/reject, conflict accept/override.

---

## 8. Responsive Behaviour
| Width | Layout |
|---|---|
| < 640 | Single column; filters in a dialog ("Filters"); table → cards; sticky bottom action bar for Book |
| 640–1023 | Two-column grids; filters collapsible |
| ≥ 1024 | Left filter rail, 3-column card grid, side-by-side detail layout |

---

## 9. Content & Microcopy
- Voice: friendly, direct, short. Sentence case. No exclamation marks, no jargon.
- Buttons are verbs: "Book this slot", "Send request", "Approve", "Cancel booking".
- Errors say **what happened + what to do**: "That slot was just taken. Here are 3 nearby options." / "Email or password is incorrect." / "You need 10 or more characters."
- Empty states: "No equipment matches these filters. Clear filters or try a broader search."
- AI transparency: small label "AI-assisted" (info colour) or "Rule-based"; tooltip/help text: "Suggestions are advice. People make the final decision."
- Fairness explainer (How it works): "When two requests clash, LabLink compares project deadlines, faculty priority, how much lab time each team has already used, and how long they've waited. A lab in-charge makes the final call."
- Times shown in IST with day name: "Tue 24 Nov, 10:00–11:00 IST".

---

## 10. Performance Budget
- JS per route ≤ ~150 KB gzipped (initial); no web fonts; images SVG/WebP ≤ 50 KB; CLS ≈ 0 (reserve image/skeleton space); LCP < 2.5 s on 4G.
- Lazy-load charts and dialogs; prefetch equipment detail on card hover/focus.
