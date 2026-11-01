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
* Cloud-sourced Google Fonts previews without installing fonts on your machine
* Download links to get complete font families from Google Fonts
* Optional uploaded WOFF, WOFF2, TTF and OTF files for private or offline previews
* Names, notes, source links, favorites, search and sorting for both libraries
* Shared folders for post collections, with folder creation, renaming and moves
* Checkboxes and bulk move, favorite, export and delete actions in both library tabs
* Optional image covers, with color swatches or type samples used by default
* Reusable color and font templates that remain available after use
* Light mode by default, with a remembered dark-mode setting
* JSON import and export, including covers and uploaded fonts
* Validated imports that keep existing entries and skip duplicates
* Instagram post fetching and multi-photo uploads, with separate color, font and photo-thumbnail toggles
* Post results grouped into a folder, with type tabs, selection checkboxes and Save selected / Save all
* Local color sampling from each photo, with optional Ollama vision analysis for additional palettes and font suggestions
* Settings menu for Ollama server configuration, installed model selection and vision connection checks
* Persistent SQLite storage and Docker volumes

## Getting Started

### GitHub Container Registry (Recommended):

Dependencies:

* Docker

```bash
docker pull ghcr.io/oxidized-elias/designtheory:latest
docker run -d --name designtheory --init --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v designtheory_data:/app/data \
  --add-host=host.docker.internal:host-gateway \
  ghcr.io/oxidized-elias/designtheory:latest
```

Open **http://localhost:3001**. The named volume keeps your library when the container is replaced. Python dependencies for Instagram fetching are included; Ollama and model weights are not bundled.

The image becomes available after the first successful **Docker Images** workflow run on `main`. The workflow publishes `latest`, `main`, full commit tags (`sha-<commit>`), and version tags for `v*.*.*` releases, for both `linux/amd64` and `linux/arm64`. Only `main` updates `latest`.

If the GHCR package is private, log in before pulling. Make the package public in GitHub's package settings to allow anonymous pulls. See [Docker setup](docs/DOCKER.md) for image updates and model connections.

### Docker Compose:

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

For Instagram URL fetching, the application automatically prepares a private Python environment and installs its packages on first use. Python 3.9 or newer with venv/ensurepip support must be available on the server. The first setup needs internet access and permission to write to `.venv/`; Docker includes the packages already.

Other scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the frontend and API for development |
| `npm run build` | Build the production frontend into `dist/` |
| `npm start` | Start the API and serve the production frontend |
| `npm test` | Run feature and regression tests |
| `npm run test:docker -- designtheory:local` | Test a built Docker image and persistence |
| `docker compose config --quiet` | Validate the Compose configuration |

## First Use

1. Open **Color palettes** or **Font pairings** and create an entry, or choose a template to make an editable copy. New palettes start without colors.
2. Add colors or font families, notes and source links. Upload a cover if you want one; enter a Google Fonts family for a cloud preview, or optionally upload a font file.
3. Save the entry. Add it to favorites or search your library to find it later. Templates stay available for your next entry.
4. Use **Import from post** to fetch an Instagram post or upload all its photos. Choose **Import colors**, **Import fonts** and **Create photo thumbnails**, and name the post folder if desired. Edit palette names and hex codes directly in the results, adding or removing colors as needed. Filter results by type, select the ones to keep, then use **Save selected** or **Save all**. You can still review and edit each result individually.
5. Use **Export library** to download a JSON backup and **Import library** to restore one. Press **Done** after post import to clear the form for the next post; saved entries and folders remain. The dark-mode switch is in the header.

# FAQ

## Data Storage

Both libraries, folders, covers and uploaded font files are stored in SQLite. Manual installs use `data/palettes.sqlite` by default. Docker stores the database under `/app/data`, backed by the volume in your startup command. The repository excludes `data/`, `UserData/`, `userdata/`, `user-data/`, uploads, exports, backups, session files, local Python environments and `.env` secrets. SQLite files and downloaded DesignTheory backup/selection JSON files are also ignored. `.env.example` remains included as a safe configuration template. These files are excluded from Docker build contexts too. If you configure a different data or session path inside the checkout, add it to `.gitignore` and `.dockerignore` before committing.

Rebuilding or restarting a container keeps its named volume. **`docker compose down -v` deletes that volume and its library.** Stop the application before copying the database directory; SQLite uses WAL files alongside the main database. See [storage and backups](docs/DOCKER.md#storage-and-backups).

## How Do Folders and Selection Work?

Each imported post creates a folder shared by its palettes and font pairings. Reimporting the same Instagram post reuses that folder. **Folders** in the sidebar lets you create, rename, open or delete folders. Deleting a folder keeps its entries in **Unfiled**. Entries created before folders were introduced remain unfiled until moved.

The folder filter applies across both library tabs. Select cards with checkboxes or **Select all shown**, then move, favorite, export or delete the selected entries. Search and folder filters limit what Select all shown selects; changing tabs or filters clears the selection. Deletion asks for confirmation. Full-library and selected-entry JSON exports include their folder metadata.

Turn **Create photo thumbnails** off in post import to save swatch or type-preview covers instead of source-photo covers. Source images remain visible during review. **Import fonts** can be turned off independently of color extraction; automatic font extraction requires an Ollama vision model.

## Application Security?

Securing the instance is the user's responsibility. DesignTheory has no built-in authentication; anyone who can access it can view and modify the library. Manage access through your reverse proxy, firewall or a service such as Cloudflare Zero Trust. Use HTTPS for remote access. Clipboard copying requires localhost or HTTPS.

## Can I Use a Local Model?

Yes. Run Ollama on this computer or any reachable host, then open **Settings → Ollama vision**. Enter its server URL, use **Load models** to choose an installed image-capable model, and click **Test connection & model**. Enable vision analysis and **Save settings**. The import dialog picks up the change immediately; no restart is required.

Settings are stored in the SQLite database and survive restarts. Environment variables `OLLAMA_URL` and `OLLAMA_MODEL` provide defaults until you save settings in the app. **Use environment defaults**, followed by **Save settings**, restores those defaults.

Inside a container, `localhost` refers to the container itself. The default Compose URL is `http://host.docker.internal:11434`; the host model server must accept connections from the container. Model weights are not downloaded by DesignTheory. See [configuration and imports](docs/CONFIGURATION.md).

## Does Instagram Import Need AI?

Color sampling does not. For palette cards, local extraction looks for the displayed swatches and ignores small labels and surrounding controls, rather than filling a fixed color count. A four-swatch design should produce four colors. Photos without clear swatches fall back to their significant sampled colors. A configured vision model can identify the designed palettes and font pairings, including multiple examples on one photo. Detected design palettes replace the whole-image fallback. Readable printed hex labels take priority over visual estimates.

Instagram support is prepared automatically on first use; the import dialog shows setup progress. Instagram can require a login session or rate-limit fetching. If the URL cannot be fetched, upload all the post's photos instead and keep the source URL for attribution. Video slides are skipped with a visible count. Nothing is saved until you review it.

## Are Extracted Fonts Exact?

Not necessarily. Vision analysis may read printed font names or suggest visually similar families. Verify the suggestions before use. Images do not contain the original font files, so extraction does not produce font binaries.

Font previews load the named family from Google Fonts automatically, without requiring OS installation. Open a pairing or its editor and choose **Download from Google Fonts** to open the family page, then use Google’s **Get font → Download all** action for the full family. The app stores the family name, not a copy of the cloud font binaries. Browsers may cache webfonts normally.

A font that is not in Google Fonts cannot be sourced from that catalog; the app marks its preview unavailable instead of claiming a fallback is the original font. You can check the name, choose another family, or optionally upload a font file. Uploaded fonts are stored with your library and have a direct download link. Font files can be up to 3 MB each; image covers can be up to 5 MB.

## Can I Import an Existing Library?

Yes. **Import library** accepts DesignTheory JSON backups and older palette-only JSON array exports, up to 99 MB. It validates the complete file and previews the additions before saving. Matching IDs and identical entries are skipped; existing entries are kept. An import is saved in one transaction.

For larger backups, copy the stopped application's complete database directory. Unsaved post-extraction results are only kept for the current page session.

## Can It Run Completely Offline?

Library management, JSON imports and local color sampling work without internet access after installation. Google Fonts previews and family downloads need internet access; uploaded font previews work offline. First-time Instagram setup needs internet access to install its Python packages. Frontend assets are bundled with the app. Vision analysis can use a local Ollama server with an already downloaded model. Fetching Instagram posts requires internet access; uploading photos does not.

## Where Is the Documentation?

* [Docker setup](docs/DOCKER.md): deployment, updates, volumes, backups and remote access
* [Configuration and imports](docs/CONFIGURATION.md): environment variables, Instagram sessions and model connections
* [Development](docs/DEVELOPMENT.md): source layout, development server and checks

<br>

## Credits

* [oxidized-elias](https://github.com/oxidized-elias) for the DesignTheory _idea_
* [Magnific - Flaticon](https://www.flaticon.com/free-icons/graphic-design "Graphic design icons") for the icon; see [CREDITS.md](CREDITS.md)
* [OpenAI Codex](https://openai.com/codex/) for implementation assistance
