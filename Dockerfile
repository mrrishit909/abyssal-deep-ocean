FROM node:24-slim AS build
WORKDIR /app
COPY . .
RUN npm ci && node data/simulators/generate.ts && node scripts/copy-assets.ts && npm run build -w @abyssal/web

FROM nginx:alpine AS web
COPY --from=build /app/apps/web/out /usr/share/nginx/html

FROM node:24-slim AS api
WORKDIR /app
COPY --from=build /app .
EXPOSE 8630
CMD ["node", "apps/api/src/server.ts"]
