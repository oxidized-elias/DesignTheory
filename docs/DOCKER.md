# Docker Setup

## Build and start

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
