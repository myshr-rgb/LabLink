# LabLink

LabLink helps students find and book campus lab equipment. Faculty review project-based requests, and lab in-charges resolve competing bookings using a ranked recommendation and its factor breakdown.

- Browse and filter the public equipment catalogue, check availability in IST, and manage bookings.
- Create projects, submit access requests, review approvals, and receive in-app notifications.
- Review conflicts, accept or override recommendations with an audit trail, and offer alternative slots.
- Use Gemini-assisted search, explanations, and justification drafts with rule-based fallbacks.

**Stack** · Next.js 15, React, TypeScript, Tailwind CSS, Zod, SQLite via `better-sqlite3`, bcryptjs, and the Gemini SDK. Vitest and Playwright cover core workflows. Docker packages the app for Cloud Run.

## Run locally

Use Node.js 22 LTS and npm.

```sh
npm install && npm run dev
```

Open `http://localhost:3000`. SQLite seeds on first use with sample equipment and a three-request FPGA conflict. `npm run verify` runs lint, type checks, tests, the production build, and the repository size check.

## Demo logins

Set `DEMO_MODE=true` in `.env.local`, restart the dev server, then choose a role under **Try a demo account** on `/login`. The role buttons sign in directly.

| Role | Seeded account |
|---|---|
| Student | `demo-student@example.edu` |
| Faculty | `demo-faculty@example.edu` |
| In-charge | `demo-incharge@example.edu` |
| Admin | `demo-admin@example.edu` |

