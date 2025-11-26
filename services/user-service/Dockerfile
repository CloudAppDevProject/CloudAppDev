# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Development stage
FROM base AS development
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npx prisma migrate deploy
EXPOSE 8080
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS build
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production --legacy-peer-deps

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs
EXPOSE 8080
CMD [ "sh", "-c", "npx prisma migrate deploy && node dist/main"]
