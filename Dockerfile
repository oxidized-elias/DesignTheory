FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/app/data/palettes.sqlite
WORKDIR /app
LABEL org.opencontainers.image.title="DesignTheory" \
      org.opencontainers.image.description="Self-hosted color palettes and font pairings" \
      org.opencontainers.image.source="https://github.com/oxidized-elias/DesignTheory"
COPY package*.json ./
RUN apk add --no-cache python3 py3-pip && python3 -m venv /opt/instagram
COPY server/requirements.txt ./server/requirements.txt
RUN /opt/instagram/bin/pip install --no-cache-dir -r server/requirements.txt
ENV PYTHON_PATH=/opt/instagram/bin/python
RUN npm ci --omit=dev && mkdir /app/data && chown node:node /app/data
COPY server ./server
COPY CREDITS.md ./CREDITS.md
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
