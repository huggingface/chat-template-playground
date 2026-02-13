# syntax=docker/dockerfile:1
# For more info: https://huggingface.co/docs/hub/spaces-sdks-docker

FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN bun run build

# Expose port 3000
EXPOSE 3000

# Set environment variable for port
ENV PORT=3000

# Start the application
CMD ["bun", "run", "build/index.js"]