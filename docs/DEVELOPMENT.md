# Development

Requires Node.js 24 or newer and npm.

```bash
npm ci
npm run dev
```

Open Vite's printed address, normally **http://localhost:5173**. The API runs on port 3001. Changing that port also requires updating `vite.config.js`.

## Production

```bash
npm run build
npm start
```

The Express server serves the generated frontend and API on port 3001.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/main.jsx` | Library views, editors, and dialogs |
| `src/theme.js` | Material UI theme and shared light/dark color tokens |
| `src/styles.css` | Layout and custom component styles |
| `src/templates.js` | Reusable palette and font templates |
| `src/Fonts.jsx` | Font previews, uploads, and editing |
| `src/Importer.jsx` | Post and multi-photo extraction review |
| `src/BackupImport.jsx` | Library backup import and preview |
| `server/app.js` | API routes and SQLite setup |
| `server/backup.js` | Validated, transactional backup imports |
| `server/import.js` | Instagram fetching and Ollama integration |
| `server/instagram.py` | Instagram carousel photo downloader |
| `test/` | Feature and regression tests |

## Checks

```sh
npm test
npm run build
docker compose config --quiet
```

Tests cover record validation, database persistence, JSON imports and rollback, duplicate handling, color extraction, Instagram URL validation, vision-response handling, template reuse, and theme contrast. The HTTP integration test explicitly skips when the environment does not permit local server ports.
