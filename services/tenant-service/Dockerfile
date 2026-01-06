# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
# Keep ts-node for seeding in production
RUN npm install --production=false ts-node typescript @types/node

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/src/seed.ts ./src/seed.ts
COPY --from=build --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nestjs
EXPOSE 8084
# Apply Prisma migrations and seed database on container startup
CMD ["sh", "-c", "npx prisma migrate deploy && npx ts-node src/seed.ts && node dist/main"]
