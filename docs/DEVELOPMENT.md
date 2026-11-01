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
| `src/Fonts.jsx` | Google Fonts and uploaded font previews, downloads, and editing |
| `src/google-fonts.js` | Shared cloud stylesheet loading and Google Fonts links |
| `src/Importer.jsx` | Post and multi-photo extraction review |
| `src/BackupImport.jsx` | Library backup import and preview |
| `server/app.js` | API routes and SQLite setup |
| `server/backup.js` | Validated, transactional backup and folder imports |
| `server/settings.js` | Persistent Ollama settings, model discovery, and connection tests |
| `src/Settings.jsx` | Ollama settings dialog |
| `server/folders.js` | Folder management and transactional library bulk actions |
| `src/Folders.jsx` | Folder manager and selectors |
| `src/post-results.js` | Import type toggles, thumbnails, and bulk-save payloads |
| `server/import.js` | Instagram fetching and Ollama integration |
| `server/instagram.py` | Instagram carousel photo downloader |
| `server/python.js` | Automatic private Python dependency setup and status |
| `test/` | Feature and regression tests |

## Checks

```sh
npm test
npm run build
docker compose config --quiet
```

Tests cover record validation, database persistence, JSON imports and rollback, duplicate handling, color extraction, Instagram URL validation, vision-response handling, template reuse, and theme contrast. The HTTP integration test explicitly skips when the environment does not permit local server ports.

## Container checks

```bash
docker build -t designtheory:local .
npm run test:docker -- designtheory:local
```

Requires access to a running Docker daemon. The check creates its own temporary container and volume, replaces the container to verify persistence, and removes those temporary resources when it finishes. Live Instagram and Ollama access are not required. The GitHub Actions image workflow runs this check for both supported architectures before publishing.
