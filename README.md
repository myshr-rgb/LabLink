# LabLink

LabLink is a campus lab resource-sharing application. The scaffold serves a public home page and a versioned health probe at `/api/health`.

Use Node.js 22 LTS and npm. Run `npm ci` then `npm run dev` and visit http://localhost:3000. Local development works with the default configuration. See `.env.example` for environment settings.

Run `npm run verify` for lint, strict type checking, unit tests, production compilation and repository size. To run browser smoke tests, install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`.

Build the container with `docker build -t lablink .`. It runs as a non-root user and listens on port 8080. Set a random `SESSION_SECRET` of at least 32 characters in production.

Architecture, phase acceptance criteria and checkpoint history are under `doc/`.

## Demo sign-in

Set `DEMO_MODE=true` in your development environment and open `/login`. Choose Student, Faculty, In-charge, or Admin under **Try a demo account**. The demo buttons start sessions for seeded `demo-student@example.edu`, `demo-faculty@example.edu`, `demo-incharge@example.edu`, and `demo-admin@example.edu`. The demo accounts use the demo buttons for access. Demo Admin has read-only account access.

The app seeds an empty SQLite database on first use. Run `npm run seed` to initialize it explicitly. The seed includes a three-request FPGA conflict and preserves existing data on repeat runs.
