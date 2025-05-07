# syntax=docker/dockerfile:1
# For more info: https://huggingface.co/docs/hub/spaces-sdks-docker

# ---- Base image ----
FROM node:20 as base
WORKDIR /app

# ---- Dependencies (production only) ----
FROM base as deps
COPY --link --chown=1000 package-lock.json package.json ./
RUN --mount=type=cache,target=/app/.npm \
    npm set cache /app/.npm && \
    npm ci --omit=dev

# ---- Builder (all dependencies) ----
FROM deps as builder
RUN --mount=type=cache,target=/app/.npm \
    npm set cache /app/.npm && \
    npm ci
COPY --link --chown=1000 . .
RUN npm run build

# ---- Runner ----
FROM node:20-slim as runner
RUN npm install -g pm2
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --link --chown=1000 package.json /app/package.json
COPY --from=builder /app/build /app/build

# Expose the port your app runs on
EXPOSE 3000

CMD pm2 start /app/build/index.js -i $CPU_CORES --no-daemon