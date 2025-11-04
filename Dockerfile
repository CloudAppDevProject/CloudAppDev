FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install 


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for flexibility
ARG DATABASE_URL_BUILD="postgresql://build:build@localhost:5432/build?schema=public"
ARG MONGODB_URI_BUILD="mongodb://build:build@localhost:27017/build"
ARG GCS_CREDENTIALS_BUILD="build-dummy-credentials"
ARG GCS_PROJECT_BUILD="build-project"
ARG GCS_BUCKET_BUILD="build-bucket"
ARG FIREBASE_CREDENTIALS_BUILD="build-dummy-firebase"

# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Set build-time environment variables (won't be used for actual connections)
ENV DATABASE_URL=$DATABASE_URL_BUILD
ENV MONGODB_URI=$MONGODB_URI_BUILD
ENV GOOGLE_CLOUD_CREDENTIALS_BASE64=$GCS_CREDENTIALS_BUILD
ENV GOOGLE_CLOUD_PROJECT_ID=$GCS_PROJECT_BUILD
ENV GOOGLE_CLOUD_STORAGE_BUCKET=$GCS_BUCKET_BUILD
ENV FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=$FIREBASE_CREDENTIALS_BUILD

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (Next.js won't actually connect to DB/GCS during build)
RUN npm run build

# Clear build-time sensitive variables for security
ENV DATABASE_URL=
ENV MONGODB_URI=
ENV GOOGLE_CLOUD_CREDENTIALS_BASE64=
ENV GOOGLE_CLOUD_PROJECT_ID=
ENV GOOGLE_CLOUD_STORAGE_BUCKET=
ENV FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install Prisma CLI in production for migrations
RUN npm install -g prisma

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./

# Copy MongoDB initialization script and required dependencies
COPY --from=builder /app/init-mongo.js ./init-mongo.js
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/mongodb ./node_modules/mongodb
COPY --from=builder /app/node_modules/bson ./node_modules/bson

USER nextjs
EXPOSE 3000
ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "npx prisma migrate deploy && (node init-mongo.js &) && node server.js"]



