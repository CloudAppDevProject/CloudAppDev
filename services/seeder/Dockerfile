# Unified Seeding Container
# This container has direct access to all service databases and handles ID dependencies internally
FROM node:20-alpine

WORKDIR /app

# Copy package.json for seeder
COPY services/seeder/package*.json ./

# Install seeder dependencies
RUN npm ci --only=production

# Copy package.json and prisma schemas for both services
COPY services/user-service/package*.json ./services/user-service/
COPY services/user-service/prisma ./services/user-service/prisma
COPY services/itinerary-service/package*.json ./services/itinerary-service/
COPY services/itinerary-service/prisma ./services/itinerary-service/prisma

# Install ALL dependencies (including devDependencies) for Prisma to work
RUN cd services/user-service && npm ci --legacy-peer-deps

# Install ALL dependencies for itinerary-service
RUN cd services/itinerary-service && npm ci --legacy-peer-deps

# Generate Prisma clients for both services
RUN cd services/user-service && npx prisma generate
RUN cd services/itinerary-service && npx prisma generate

# Copy source code
COPY services/user-service/src ./services/user-service/src
COPY services/itinerary-service/src ./services/itinerary-service/src

# Copy seed script and dataset
COPY services/seeder/seed.js ./seed.js
COPY seed-data/dataset.json ./seed-data/dataset.json

# Run as non-root user for security
USER node

CMD ["node", "seed.js"]
