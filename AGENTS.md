# Repository Guidelines

## Project Structure & Module Organization

DesignTheory uses React and Material UI with an Express API and SQLite storage.

- `src/`: library views, import editors, shared theme, color extraction, and Google Fonts loading. React components use `.jsx`; utilities use `.js`.
- `server/`: API routes, validation, transactional imports, folders, settings, and Python Instagram helpers.
- `test/`: Node regression tests and image fixtures in `test/fixtures/`.
- `public/`: bundled assets; retain icon attribution in `CREDITS.md`.
- `docs/`: Docker, configuration, and development instructions.
- `scripts/docker-smoke.mjs` and `.github/workflows/docker.yml`: container verification and multi-architecture GHCR publishing.

## Build, Test, and Development Commands

Requires Node.js 24 or newer.

- `npm ci`: install locked dependencies.
- `npm run dev`: start the API on port 3001 and Vite, normally on port 5173.
- `npm run build`: generate the frontend in `dist/`.
- `npm start`: serve the production build and API.
- `npm test`: run Node's built-in test runner.
- `docker compose up -d --build`: build and start the persistent container deployment.
- `npm run test:docker -- designtheory:local`: verify an already-built image using temporary containers and a volume.

## Coding Style & Naming Conventions

Use ES modules, PascalCase component names, and camelCase functions and variables. Prefer two-space indentation for new JavaScript/JSX and four spaces for Python; preserve surrounding formatting in existing compact modules. No formatter or lint command is configured.

Use Material UI controls and shared tokens in `src/theme.js`. Keep validation on the server, bind SQL values, and use transactions for multi-record changes.

## Testing Guidelines

Name tests `test/*.test.js` and use `node:test` with `node:assert/strict`. Cover changed behavior, especially persistence, rollback, selection boundaries, and extraction accuracy. Mock external services; use fixtures for image regressions. No numerical coverage threshold is configured. Run relevant tests and the production build. Report skipped HTTP tests when local listeners are prohibited; container checks require Docker access.

## Commit & Pull Request Guidelines

History currently contains `Build DesignTheory`; no formal prefix convention is established. Use concise, imperative commit subjects. PRs should describe the resulting behavior, link relevant issues, list validation and limitations, and include screenshots for visible changes. Update documentation for configuration or workflow changes.

## Data & Configuration

Keep databases, user data, exports, credentials, sessions, and virtual environments out of Git and Docker build contexts. Preserve existing volumes and database compatibility. Ollama settings persist in SQLite; cloud font previews require Google Fonts access. The shared workspace has no built-in authentication.
