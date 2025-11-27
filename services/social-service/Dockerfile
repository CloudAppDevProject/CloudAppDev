# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build
# Note: Using npm prune to reduce image size
# CLI scripts use pre-compiled JavaScript (node, not ts-node)
# This keeps the image lean while supporting async workflows
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Copy newsletter Handlebars templates needed for email rendering
# Note: These are static .hbs files, not compiled code
# The build stage compiles TypeScript to dist/, but these templates aren't compiled
COPY --from=build --chown=nestjs:nodejs /app/src/newsletter/templates ./dist/newsletter/templates

USER nestjs
EXPOSE 8082

CMD ["node", "dist/main"]
