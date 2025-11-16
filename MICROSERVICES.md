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

# 4. Check status
docker-compose -f docker-compose.microservices.yml ps
```

## Services

| Service | Port | URL |
|---------|------|-----|
| **User Service** | 8080 | <http://localhost:8080/api/v1> |
| **Itinerary Service** | 8081 | <http://localhost:8081/api/v1> |
| **Social Service** | 8082 | <http://localhost:8082/api/v1> |

## Architecture

- **User Service**: PostgreSQL + Firebase Auth
- **Itinerary Service**: PostgreSQL + Google Cloud Storage
- **Social Service**: MongoDB
- **Communication**: Container-to-container via Docker network

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
