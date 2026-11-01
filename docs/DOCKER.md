# Docker Setup

## GitHub Container Registry

After the first successful **Docker Images** run on `main`:

```bash
docker pull ghcr.io/oxidized-elias/designtheory:latest
docker run -d --name designtheory --init --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v designtheory_data:/app/data \
  --add-host=host.docker.internal:host-gateway \
  ghcr.io/oxidized-elias/designtheory:latest
```

Open **http://localhost:3001**. Both AMD64 and ARM64 Linux are supported. Docker selects the matching architecture automatically. A public GHCR package supports anonymous pulls; a private package requires `docker login ghcr.io` with an appropriately authorized GitHub token.

For a host Ollama server, add these options before the image name in `docker run`:

```bash
-e OLLAMA_URL=http://host.docker.internal:11434 \
-e OLLAMA_MODEL=your-installed-vision-model
```

The model server must be reachable from the container. See [configuration](CONFIGURATION.md).

### Update a registry deployment

Back up your data, then pull and replace the container while reusing its volume:

```bash
docker pull ghcr.io/oxidized-elias/designtheory:latest
docker stop designtheory
docker rm designtheory
```

Run the original `docker run` command again with the same volume and any environment settings you added. Removing the container does not remove the named volume. Pin `ghcr.io/oxidized-elias/designtheory:sha-<full-commit>` or a release version instead of `latest` when you need a fixed image.

### Back up a registry deployment

```bash
docker stop designtheory
docker run --rm --user root \
  -v designtheory_data:/app/data \
  -v "$PWD/backups:/backup" \
  --entrypoint sh ghcr.io/oxidized-elias/designtheory:latest \
  -c 'cp -a /app/data/. /backup/'
docker start designtheory
```

Use the volume name from your deployment if different. Restore with the application stopped, preserving writable ownership for UID 1000.

## Build and start from source

```bash
git clone https://github.com/oxidized-elias/DesignTheory.git
cd DesignTheory
docker compose up -d --build
```

Open **http://localhost:3001**. Compose builds the application from source and attaches `palette-data` to `/app/data`. Python and the Instagram-fetch dependencies are included in the image. Vision analysis needs a separately configured Ollama server; see [configuration](CONFIGURATION.md).

## Update

```bash
git pull
docker compose up -d --build
```

## Stop

```bash
docker compose down
```

This preserves the named volume. **Adding `-v` deletes the library.**

## Standalone Docker

```bash
docker build -t designtheory:local .
docker run -d --name designtheory --init --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v designtheory_data:/app/data \
  --add-host=host.docker.internal:host-gateway \
  designtheory:local
```

The standalone command uses a different named volume from Compose. When switching deployment methods, restore a backup or explicitly mount your existing volume. Do not assume both commands use the same data.

## Storage and backups

Both libraries, image covers, and uploaded font files are stored in SQLite. The original Compose service name, `colorpaletts`, and database path are retained for compatibility with earlier installations.

For a complete Docker backup, stop the app and copy the data directory:

```sh
docker compose stop
docker compose run --rm --no-deps --user root -v "$PWD/backups:/backup" colorpaletts sh -c 'cp -a /app/data/. /backup/'
docker compose start
```

Keep backups outside the volume. SQLite uses WAL mode, so copying only the main database file while the app is running can produce an incomplete backup.

To restore, stop the app, replace the contents of its data directory with the complete backup, and make sure the files are writable by the application user. The Docker image runs as `node`, UID 1000. Restart the app after restoring.

For a local install, stop the process before copying or replacing `data/`.

## Remote access

DesignTheory is a shared workspace with no built-in authentication. Use it on a trusted network, or put it behind an authenticated HTTPS reverse proxy for remote access. Anyone with access to the app can view and modify the library.

Compose publishes port 3001 on the host. To restrict access to a local reverse proxy, change the Compose port mapping to `127.0.0.1:3001:3001`.

## Image publishing

[Docker Images](../.github/workflows/docker.yml) runs on pushes to `main`, version tags matching `v*.*.*`, pull requests, and manual dispatch. Pull requests build and test without publishing. Manual dispatch publishes only when run against `main` or a version tag.

Each architecture builds on a native runner and runs the application's tests plus a container smoke check. The smoke check verifies static assets, Python dependencies, the non-root runtime, both libraries surviving container replacement, and backup restore. Once both architectures pass, the workflow publishes their combined manifest to `ghcr.io/oxidized-elias/designtheory`.

Published tags:

| Tag | Updated by |
| --- | --- |
| `latest`, `main` | Successful `main` builds |
| `sha-<full-commit>` | Successful publishable builds |
| `1.2.3`, `1.2`, `1` | A matching release tag such as `v1.2.3`; major `0` is omitted |

Publishing uses the repository's `GITHUB_TOKEN` with `packages: write`; no separate registry secret is configured. GitHub repository and organization policies must allow publishing. If the first package is private, set its visibility to public in the package settings to enable anonymous pulls. See [GitHub's image publishing documentation](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).
