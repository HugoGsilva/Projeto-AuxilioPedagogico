# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS build
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile

ARG VITE_SERVER_URL=http://localhost:3000
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV SKIP_ENV_VALIDATION=true
ENV NODE_ENV=production

RUN bun run build

FROM nginx:1.27-alpine AS web
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

FROM oven/bun:1.3.14 AS server
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json /app/bun.lock /app/turbo.json ./
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist

WORKDIR /app/apps/server
EXPOSE 3000
CMD ["bun", "run", "dist/index.mjs"]
