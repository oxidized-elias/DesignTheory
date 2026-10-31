<p align="center">
  <img src="public/graphic-designer.png" width="120" alt="DesignTheory logo" />
</p>
<h1 align="center">DesignTheory</h1>
<p align="center">
  Self-hosted Color Palettes and Font Pairings<br>
  Collect colors, type combinations and the sources that inspired them<br>
  Built with Material UI, with your library stored on your own server
</p>

<br>

## Features

* Color palettes with any number of colors and click-to-copy hex codes
* Font pairings with family names, roles and custom preview text
* Uploaded WOFF, WOFF2, TTF and OTF files for exact font previews
* Names, notes, source links, favorites, search and sorting for both libraries
* Optional image covers, with color swatches or type samples used by default
* Reusable color and font templates that remain available after use
* Light mode by default, with a remembered dark-mode setting
* JSON import and export, including covers and uploaded fonts
* Validated imports that keep existing entries and skip duplicates
* Instagram post fetching and multi-photo uploads for extracting inspiration
* Local color sampling from each photo, with optional Ollama vision analysis for additional palettes and font suggestions
* Persistent SQLite storage and Docker volumes

## Getting Started

### Docker Compose (Recommended):

Dependencies:

* Docker with the Compose plugin
* git

```bash
git clone https://github.com/oxidized-elias/DesignTheory.git
cd DesignTheory
docker compose up -d --build
```

Open **http://localhost:3001**. The named volume keeps your library when the container is rebuilt or replaced. Python dependencies for Instagram fetching are included; Ollama and model weights are not bundled.

### Dockerfile:

Dependencies:

* Docker
* git

```bash
git clone https://github.com/oxidized-elias/DesignTheory.git
cd DesignTheory
docker build -t designtheory:local .
docker run -d --name designtheory --init --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v designtheory_data:/app/data \
  --add-host=host.docker.internal:host-gateway \
  designtheory:local
```

Open **http://localhost:3001**. This standalone command uses a separate volume from Compose. See [Docker setup](docs/DOCKER.md) for updates, backups, existing volumes and remote access.

### Manual Install:

Dependencies:

* git
* Node.js 24 or newer
* npm
* Python 3 for Instagram URL fetching only

```bash
git clone https://github.com/oxidized-elias/DesignTheory.git
cd DesignTheory
npm ci
npm run build
npm start
```

Open **http://localhost:3001**. The app creates its database under `data/` automatically. Ctrl+C stops the server.

For Instagram URL fetching, also install the Python dependencies:

```bash
python3 -m venv .venv
.venv/bin/pip install -r server/requirements.txt
```

Other scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the frontend and API for development |
| `npm run build` | Build the production frontend into `dist/` |
| `npm start` | Start the API and serve the production frontend |
| `npm test` | Run feature and regression tests |
| `docker compose config --quiet` | Validate the Compose configuration |

## First Use

1. Open **Color palettes** or **Font pairings** and create an entry, or choose a template to make an editable copy. New palettes start without colors.
2. Add colors or font families, notes and source links. Upload a cover if you want one; upload font files for exact type previews.
3. Save the entry. Add it to favorites or search your library to find it later. Templates stay available for your next entry.
4. Use **Import from post** to fetch an Instagram post or upload all its photos. Review and edit the extracted results before saving each one.
5. Use **Export library** to download a JSON backup and **Import library** to restore one. The dark-mode switch is in the header.

# FAQ

## Data Storage

Both libraries, covers and uploaded font files are stored in SQLite. Manual installs use `data/palettes.sqlite` by default. Docker stores the database under `/app/data`, backed by the volume in your startup command. User data, backups and secrets are git-ignored.

Rebuilding or restarting a container keeps its named volume. **`docker compose down -v` deletes that volume and its library.** Stop the application before copying the database directory; SQLite uses WAL files alongside the main database. See [storage and backups](docs/DOCKER.md#storage-and-backups).

## Application Security?

Securing the instance is the user's responsibility. DesignTheory has no built-in authentication; anyone who can access it can view and modify the library. Manage access through your reverse proxy, firewall or a service such as Cloudflare Zero Trust. Use HTTPS for remote access. Clipboard copying requires localhost or HTTPS.

## Can I Use a Local Model?

Yes. Configure an Ollama server on this computer or any reachable host. Set `OLLAMA_MODEL` to an installed image-capable model and `OLLAMA_URL` to its server address. With Docker, copy `.env.example` to `.env` and edit those values, then run `docker compose up -d`.

Inside a container, `localhost` refers to the container itself. The default Compose URL is `http://host.docker.internal:11434`; the host model server must accept connections from the container. Model weights are not downloaded by DesignTheory. See [configuration and imports](docs/CONFIGURATION.md).

## Does Instagram Import Need AI?

Color sampling does not. Every imported photo produces a sampled palette locally. A configured vision model can suggest additional palettes and font pairings, including multiple examples on one photo.

Instagram can require a login session or rate-limit fetching. If the URL cannot be fetched, upload all the post's photos instead and keep the source URL for attribution. Video slides are skipped with a visible count. Nothing is saved until you review it.

## Are Extracted Fonts Exact?

Not necessarily. Vision analysis may read printed font names or suggest visually similar families. Verify the suggestions before use. Images do not contain the original font files, so extraction does not produce font binaries.

For exact previews, upload your font files. Otherwise the app uses the named font if installed on your device, with a serif fallback. Font files can be up to 3 MB each; image covers can be up to 5 MB.

## Can I Import an Existing Library?

Yes. **Import library** accepts DesignTheory JSON backups and older palette-only JSON array exports, up to 99 MB. It validates the complete file and previews the additions before saving. Matching IDs and identical entries are skipped; existing entries are kept. An import is saved in one transaction.

For larger backups, copy the stopped application's complete database directory. Unsaved post-extraction results are only kept for the current page session.

## Can It Run Completely Offline?

The library, templates, JSON imports and local color sampling work without internet access after installation. Frontend assets are bundled with the app. Vision analysis can use a local Ollama server with an already downloaded model. Fetching Instagram posts requires internet access; uploading photos does not.

## Where Is the Documentation?

* [Docker setup](docs/DOCKER.md): deployment, updates, volumes, backups and remote access
* [Configuration and imports](docs/CONFIGURATION.md): environment variables, Instagram sessions and model connections
* [Development](docs/DEVELOPMENT.md): source layout, development server and checks

<br>

## Credits

* [oxidized-elias](https://github.com/oxidized-elias) for the DesignTheory _idea_
* [Magnific - Flaticon](https://www.flaticon.com/free-icons/graphic-design "Graphic design icons") for the icon; see [CREDITS.md](CREDITS.md)
* [OpenAI Codex](https://openai.com/codex/) for implementation assistance
