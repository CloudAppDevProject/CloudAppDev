# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build
# Note: NOT pruning production dependencies to keep ts-node and TypeScript
# for CLI scripts (newsletter) that run in Kubernetes CronJobs
# This slightly increases image size but is necessary for async workflows

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# CRITICAL: Copy source code and build tools for CLI scripts (newsletter, etc.)
# This is needed for ts-node to execute CLI commands in Kubernetes CronJobs
COPY --from=build --chown=nestjs:nodejs /app/src ./src
COPY --from=build --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copy newsletter templates for email rendering
RUN mkdir -p ./dist/newsletter/templates
COPY --from=build --chown=nestjs:nodejs /app/src/newsletter/templates ./dist/newsletter/templates

USER nestjs
EXPOSE 8082

CMD ["node", "dist/main"]
