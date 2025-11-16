# Microservices Setup

Quick guide for running the microservices architecture locally.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Firebase credentials (in `.env`)

## Quick Start

```bash
# 1. Copy environment file
cp .env.microservices .env

# 2. Add Firebase credentials to .env (if not already present)
# FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=...
# GOOGLE_CLOUD_STORAGE_BUCKET=...
# GOOGLE_CLOUD_CREDENTIALS_BASE64=...
# GOOGLE_CLOUD_PROJECT_ID=...

# 3. Start all services
docker-compose -f docker-compose.microservices.yml up -d

# 4. Seed all databases with test data (ONE COMMAND!)
npm run seed:microservices

# 5. Check status
docker-compose -f docker-compose.microservices.yml ps
```

## Services

| Service | Port | URL |
|---------|------|-----|
| **User Service** | 8080 | <http://localhost:8080/api/v1> |
| **Itinerary Service** | 8081 | <http://localhost:8081/api/v1> |
| **Social Service** | 8082 | <http://localhost:8082/api/v1> |

## Architecture

- **User Service**: PostgreSQL (port 5433) + Firebase Auth
- **Itinerary Service**: PostgreSQL (port 5434) + Google Cloud Storage
- **Social Service**: MongoDB (port 27017)
- **Communication**: Container-to-container via Docker network

## Database Seeding

Seed all three microservices with realistic test data:

```bash
npm run seed:microservices
```

This will:

- ✅ Start Docker services if not running
- ✅ Seed User Service with 10 users
- ✅ Seed Itinerary Service with 18 itineraries and locations
- ✅ Seed Social Service with comments and likes

**Test Users:**

- `emma.rodriguez@example.com` / Traditional auth
- `liam.chen@example.com` / Google auth
- `sofia.andersson@example.com` / Traditional auth
- ...and 7 more diverse users

## Stop Services

```bash
docker-compose -f docker-compose.microservices.yml down
```

## Logs

```bash
# View all logs
docker-compose -f docker-compose.microservices.yml logs -f

# View specific service
docker logs cloudappdev_user_service -f
```
