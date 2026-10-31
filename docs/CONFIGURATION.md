# Configuration and Imports

## Server configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Application server port |
| `HOST` | `0.0.0.0` | Application bind address |
| `DATABASE_PATH` | `./data/palettes.sqlite` | Persistent SQLite database path |
| `OLLAMA_URL` | `http://127.0.0.1:11434` locally | Vision server address; Compose defaults to the host gateway |
| `OLLAMA_MODEL` | Unset | Installed vision model; unset disables automatic font suggestions |
| `PYTHON_PATH` | Project virtual environment, then `python3` | Python interpreter for Instagram fetching |
| `INSTAGRAM_USERNAME` | Unset | Username associated with the supplied Instaloader session |
| `INSTAGRAM_SESSION_FILE` | Unset | Path to an existing Instaloader session file |

Restart the app after changing server configuration. Compose reads `.env` for its declared Ollama variables; local Node commands use environment variables supplied by your shell. Changing the development API port also requires updating `vite.config.js`.

## Extracting inspiration

Choose **Import from post** and paste an Instagram post URL, or upload all photos from a post together. Keep the post URL as a source link when using uploads.

Each photo produces a locally sampled color palette. With a configured vision model, the app can also suggest separate palettes and font pairings within the same photo. Each result retains its source image and link for review. Edit, save, or discard results individually; nothing is added to the library automatically.

### Instagram access

The server uses [Instaloader](https://instaloader.github.io/as-module.html) to fetch the post and enumerate its carousel photos. Video slides are skipped with a visible count. If fetching the photos fails, the app reports the failure and offers multi-photo upload instead.

Instagram can require login or rate-limit requests. For session-based access, configure `INSTAGRAM_USERNAME` and `INSTAGRAM_SESSION_FILE` on the server using a session created with Instaloader. Docker users must explicitly add those environment variables and mount the session file read-only. The app does not collect Instagram passwords.

### Optional vision analysis

Run an image-capable model on an [Ollama](https://docs.ollama.com/capabilities/vision) server. For Docker, copy the example configuration:

```sh
cp .env.example .env
```

Set `OLLAMA_MODEL` to the exact name of your installed vision model, and `OLLAMA_URL` to an address reachable from the application container. Then recreate the container:

```sh
docker compose up -d
```

The default Docker URL is `http://host.docker.internal:11434`. Compose adds the Linux host gateway, but the host's Ollama service must also listen on an interface reachable from the container.

Images are sent to your configured vision endpoint, one photo at a time. Local color sampling does not require a model and remains available if vision analysis fails.

**Font suggestions need verification.** A model may read font labels or estimate visually similar families. Raster images do not contain the original font files, and the app cannot extract those binaries from a photo. Upload your own font files for exact previews. Unsaved extraction results are lost when the page is reloaded.

## Local Instagram dependencies

Install Python 3, then run these commands from the project directory:

```bash
python3 -m venv .venv
.venv/bin/pip install -r server/requirements.txt
```

The app detects `.venv/bin/python` automatically. Docker includes these dependencies. For a different interpreter, set `PYTHON_PATH`.

## Local vision setup

```bash
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=your-installed-vision-model npm run dev
```

Use the exact name of an installed image-capable model. Neither model weights nor an Ollama server are bundled with DesignTheory.
