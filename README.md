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

## Environment variables

| Variable | Purpose |
|---|---|
| `DEMO_MODE` | Enables seeded role sign-ins when set to `true`. Defaults to `false`. |
| `GEMINI_API_KEY` | Optional server-side Gemini key. An empty value enables rule-based suggestions. |
| `APP_URL` | Canonical origin used for write requests. Defaults to `http://localhost:3000`. Set it to the HTTPS service URL on Cloud Run. |
| `SESSION_SECRET` | Required in production. Use a random value of at least 32 characters. |

See [`.env.example`](.env.example) for the full configuration.

## Deploy to Cloud Run

Use an authenticated Google Cloud CLI with an active project. Create a Secret Manager secret named `lablink-session-secret` and grant the Cloud Run service identity access to it.

```sh
REGION=asia-south1
gcloud run deploy lablink --source . --region "$REGION" --allow-unauthenticated \
  --min-instances=1 --max-instances=1 \
  --set-env-vars=DEMO_MODE=true \
  --set-secrets=SESSION_SECRET=lablink-session-secret:latest

APP_URL="$(gcloud run services describe lablink --region "$REGION" --format='value(status.url)')"
gcloud run services update lablink --region "$REGION" --update-env-vars="APP_URL=$APP_URL"
```

Check `$APP_URL/api/health`. The container uses instance-local SQLite storage, so replacing the instance can reset demo data. [Cloud Run deploy reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy).
