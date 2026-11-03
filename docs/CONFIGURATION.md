# Configuration and Imports

## Ollama settings menu

Open **Settings → Ollama vision** from the sidebar or **Open settings** in the import dialog.

1. Enter the Ollama server URL reachable from the DesignTheory server.
2. Use **Load models** to list installed models, or enter the exact model name.
3. Select an image-capable model and click **Test connection & model**. The test checks the model's reported vision capability without downloading models or running an image-generation request. Older servers that omit capabilities are reported as unverified.
4. Enable vision analysis and click **Save settings**.

Changes are stored in SQLite and apply immediately to new analysis requests, including the open import dialog. The connection test does not save your edits. **Use environment defaults** stages a reset; click **Save settings** to apply it. Disabling vision in Settings overrides an enabled environment default. Model weights must already be installed on your Ollama server.

Full database backups include these workspace settings. JSON library exports contain library entries and folders, not server configuration.

## Server configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Application server port |
| `HOST` | `0.0.0.0` | Application bind address |
| `DATABASE_PATH` | `./data/palettes.sqlite` | Persistent SQLite database path |
| `OLLAMA_URL` | `http://127.0.0.1:11434` locally | Vision server address; Compose defaults to the host gateway |
| `OLLAMA_MODEL` | Unset | Installed vision model; unset disables automatic font suggestions |
| `PYTHON_PATH` | Automatically detected | Preferred Python interpreter; a ready environment is reused |
| `INSTAGRAM_VENV_PATH` | `./.venv` | Writable private environment for automatic package setup |
| `INSTAGRAM_USERNAME` | Unset | Username associated with the supplied Instaloader session |
| `INSTAGRAM_SESSION_FILE` | Unset | Path to an existing Instaloader session file |

Environment changes require restarting the server; saved Ollama settings in the app take precedence and do not require a restart. Compose reads `.env` for its declared Ollama variables; local Node commands use environment variables supplied by your shell. Changing the development API port also requires updating `vite.config.js`.

## Extracting inspiration

Choose **Import from post** and paste an Instagram post URL, or upload all photos from a post together. Keep the post URL as a source link when using uploads.

Enable **Import colors** to sample a palette from each photo. **Import fonts** independently enables vision-based font pairing suggestions. Disable either toggle to exclude that result type from extraction and saving. The local extractor looks for flat swatch regions, excludes small text and surrounding controls, and uses the number of swatches found rather than a fixed six-color quota. Sampling preserves the photo aspect ratio and uses actual representative pixel colors.

With a configured vision model, the app can also identify separate designed palettes and font pairings within the same photo. Detected design palettes replace the fallback image palette instead of adding a duplicate. The model is instructed to use exact readable hex labels, count only the displayed swatches, preserve distinct similar colors, and exclude navigation, labels, borders and other image chrome. Extraction can still need review, particularly for photographs or ambiguous layouts. Each result retains its source image and link for review. Each post gets a persistent folder shared across both libraries. A custom folder name is optional; importing the same source reuses its folder. Existing unfiled entries can be moved with the library selection controls.

Edit, save, or discard results individually, or select results using their checkboxes and use **Save selected**. When every eligible result is selected, the button reads **Save all**. Type tabs filter the results; Select all shown affects only the current result tab. Turning off an import type hides its results and excludes them from saving.

**Create photo thumbnails** controls whether source photos become saved cover images. With it off, saved entries use swatches or type samples, while the source image remains available for review. This toggle also applies when reviewing and saving an individual result. Bulk saving validates the entire batch and commits it in one transaction, skipping existing duplicates. If saving fails, the results remain available to review or retry. Nothing is added to the library automatically.

### Instagram access

The server uses [Instaloader](https://instaloader.github.io/as-module.html) to fetch the post and enumerate its carousel photos. Video slides are skipped with a visible count. If fetching the photos fails, the app reports the failure and offers multi-photo upload instead.

Instagram can require login or rate-limit requests. For session-based access, configure `INSTAGRAM_USERNAME` and `INSTAGRAM_SESSION_FILE` on the server using a session created with Instaloader. Docker users must explicitly add those environment variables and mount the session file read-only. The app does not collect Instagram passwords.

### Optional vision analysis

Run an image-capable model on an [Ollama](https://docs.ollama.com/capabilities/vision) server. For Docker, copy the example configuration:

```sh
cp .env.example .env
```

For environment-based defaults, set `OLLAMA_MODEL` to the exact name of your installed vision model, and `OLLAMA_URL` to an address reachable from the application container. Alternatively, configure the same values in Settings without recreating the container. To apply changed environment defaults:

```sh
docker compose up -d
```

The default Docker URL is `http://host.docker.internal:11434`. Compose adds the Linux host gateway, but the host's Ollama service must also listen on an interface reachable from the container.

Images are sent to your configured vision endpoint, one photo at a time. Local color sampling does not require a model and remains available if vision analysis fails.

**Font suggestions need verification.** A model may read font labels or estimate visually similar families. Raster images do not contain the original font files, and the app cannot extract those binaries from a photo. Recognized family names are loaded from Google Fonts for cloud previews without OS font installation. Families outside that catalog are marked unavailable; an uploaded font file can be used instead. Unsaved extraction results are lost when the page is reloaded.

## Automatic Instagram setup

On the first Instagram URL import, the application checks the configured interpreter, its private environment, and system Python for working Instagram packages. If none is ready, it creates a private virtual environment and installs `server/requirements.txt` automatically before fetching the post. Existing private environments with missing packages are repaired.

The import dialog shows progress while setup runs. Concurrent requests share one setup attempt, and failed setup can be retried. A working environment is reused for later requests and across application restarts, so normal imports do not reinstall packages.

Local installs need Python 3.9 or newer with venv/ensurepip support, internet access for the first package installation, and write access to the private environment directory. `INSTAGRAM_VENV_PATH` changes that directory; it defaults to `.venv/` in the project. `PYTHON_PATH` selects a preferred interpreter. Packages are installed into the private environment, never into system Python or a custom interpreter's global environment.

Docker already includes a working Python environment at `/opt/instagram`; no first-use download is needed with the standard image. This setup handles Python packages, not operating-system installation of Python itself. Missing Python, venv support, or network access is reported with an actionable error.

## Local vision setup

```bash
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=your-installed-vision-model npm run dev
```

Use the exact name of an installed image-capable model. Neither model weights nor an Ollama server are bundled with DesignTheory.

## Cloud font previews and downloads

Font families without an uploaded file use the [Google Fonts CSS API](https://developers.google.com/fonts/docs/css2). Stylesheets and webfont files are loaded by the browser from Google Fonts, with requests shared across previews of the same family. The app does not write those font binaries to its server or install them into the operating system. Normal browser caching still applies. Preview text is not added to the Google Fonts request URL.

Pairing details and the font editor include **Download from Google Fonts** links. These open the full family page on fonts.google.com, where **Get font → Download all** provides the font family. This avoids presenting a language-subset webfont as the complete family. Downloads happen only when the user requests them through Google Fonts.

Font names must exist in the Google Fonts catalog for cloud previews. An unknown name or network failure shows an unavailable status, a catalog search link, and a retry action. The temporary fallback sample is explicitly identified. Existing uploaded fonts continue to use their uploaded files and provide a direct download link. Google Fonts requires internet access; uploaded fonts remain available offline. JSON backups store Google font family metadata, while uploaded font binaries remain embedded as before.

## Host-controlled locked mode

Configure these variables on the server, never in the browser or SQLite settings:

```dotenv
LOCKED_MODE=false
LOCKED_DOMAINS=inspiration.example.com,public.example.org
WRITE_TOKEN=replace-with-a-random-secret-of-at-least-32-characters
```

`LOCKED_DOMAINS` accepts comma-separated hostnames without schemes, paths, or wildcards. Each entry includes its subdomains and all ports. Requests addressed to these domains, or carrying their Origin/Referer, cannot mutate data even with the write token. All unsafe API methods are blocked before JSON parsing: palette/font creation, editing, deletion, favorites, folders, bulk operations, backup imports, settings changes, connection tests, Instagram fetching, and vision analysis. Reads and exports remain available. The UI shows a read-only banner.

Domain headers are client-controlled and cannot authenticate a caller. Therefore, once any locked domain is configured, **every write through every other address also requires `WRITE_TOKEN`**. Without a token, all writes are denied. On an unlocked address, enter the token in the read-only banner to enable editing; it stays in page memory until reload. API clients use `Authorization: Bearer <token>`. A token can also protect writes without configuring domains. Use a unique randomly generated secret (`openssl rand -hex 32`); never embed it in frontend code, URLs, exported files, or `VITE_` variables. Only give the token to trusted administrators: it grants access to all write operations, including server-side Ollama requests.

Set `LOCKED_MODE=true` to deny all API writes on the entire instance, regardless of token or request headers. This is the strongest choice for a public read-only deployment. With all three variables unset, the existing unauthenticated shared-workspace behavior remains.

Compose reads these variables from the host `.env`; run `docker compose up -d` after changing them. For local Node runs, export them in the shell before starting the app (`.env` is not loaded automatically). Invalid configuration prevents startup. Keep `.env` private.

Use HTTPS for administrator access. A reverse proxy must preserve the public `Host` header and reject unexpected hosts. Forwarded headers never authorize writes. Do not expose an additional unprotected app instance sharing the same database. Origin/Referer and browser fetch metadata provide additional browser protections, but authentication is what prevents header spoofing from granting writes. The app does not provide separate user accounts or read privacy. Locked mode controls application API mutations; the process still opens SQLite and may create its normal schema/WAL files at startup.
