# Build context is the repository root: docker build -f test/stub-upstream/Dockerfile .
FROM node:24-alpine
WORKDIR /stub
COPY package.json ./
COPY test/stub-upstream/server.ts test/stub-upstream/server.ts
COPY test/fixtures test/fixtures
USER node
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=2s --retries=5 CMD wget -qO- "http://127.0.0.1:8080/v1/search?name=health" >/dev/null || exit 1
CMD ["node", "test/stub-upstream/server.ts", "8080"]
