# LabLink

LabLink is a campus lab resource-sharing application. The scaffold serves a public home page and a versioned health probe at `/api/health`.

Use Node.js 22 LTS and npm. Run `npm ci` then `npm run dev` and visit http://localhost:3000. Local development works with the default configuration. See `.env.example` for environment settings.

Run `npm run verify` for lint, strict type checking, unit tests, production compilation and repository size. To run browser smoke tests, install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`.

Build the container with `docker build -t lablink .`. It runs as a non-root user and listens on port 8080. Set a random `SESSION_SECRET` of at least 32 characters in production.

Architecture, phase acceptance criteria and checkpoint history are under `doc/`.
