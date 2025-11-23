# Microservices Setup with API Gateway

Quick guide for running the microservices architecture locally with API Gateway.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Firebase credentials (in `.env`)

## Quick Start

```bash
# 1. Copy environment file
cp example.env .env

# 2. Add Firebase credentials to .env (if not already present)
# FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=...
# GOOGLE_CLOUD_STORAGE_BUCKET=...
# GOOGLE_CLOUD_CREDENTIALS_BASE64=...
# GOOGLE_CLOUD_PROJECT_ID=...

# 3. Start all services (including API Gateway)
docker-compose -f docker-compose.microservices.yml up -d

# 4. Seed all databases with test data (ONE COMMAND!)
npm run seed:microservices

# 5. Check status
docker-compose -f docker-compose.microservices.yml ps
```

## API Gateway

All API requests go through the **API Gateway** on port **8000**:

```bash
http://localhost:8000/api/v1/users
http://localhost:8000/api/v1/itineraries
http://localhost:8000/api/v1/social
```

The gateway handles routing to the appropriate microservice.

## Services

| Service | Direct Port | Gateway URL |
|---------|-------------|-------------|
| **API Gateway** | 8000 | <http://localhost:8000> |
| **User Service** | 8080 | <http://localhost:8000/api/v1/users> |
| **Itinerary Service** | 8081 | <http://localhost:8000/api/v1/itineraries> |
| **Social Service** | 8082 | <http://localhost:8000/api/v1/social> |

**Note**: While services are accessible on their direct ports (8080, 8081, 8082), all frontend and inter-service communication should go through the gateway (port 8000).

## Architecture

- **API Gateway**: Nginx reverse proxy (port 8000) - Single entry point
- **User Service**: PostgreSQL (port 5433) + Firebase Auth
- **Itinerary Service**: PostgreSQL (port 5434) + Google Cloud Storage
- **Social Service**: MongoDB (port 27017)
- **Communication**: All traffic routed through API Gateway

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

## Environment Variables

Key environment variables in `.env`:

```bash
# API Gateway - Single entry point for frontend
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8000

# Service-to-service communication (all through API Gateway)
USER_SERVICE_URL=http://api-gateway:80/api/v1/users
ITINERARY_SERVICE_URL=http://api-gateway:80/api/v1/itineraries
SOCIAL_SERVICE_URL=http://api-gateway:80/api/v1/social

# Database URLs (for seeding from host)
USER_DATABASE_URL=postgresql://appuser:devpass123@localhost:5433/users_db?schema=public
ITINERARY_DATABASE_URL=postgresql://appuser:devpass123@localhost:5434/itineraries_db?schema=public
SOCIAL_MONGODB_URI=mongodb://localhost:27017/social_db
```

## Stop Services

```bash
docker-compose -f docker-compose.microservices.yml down
```

## Logs

```bash
# View all logs
docker-compose -f docker-compose.microservices.yml logs -f

# View API Gateway logs
docker logs cloudappdev_api_gateway -f

# View specific service
docker logs cloudappdev_user_service -f
docker logs cloudappdev_itinerary_service -f
docker logs cloudappdev_social_service -f
```

## Testing the Gateway

```bash
# Health check
curl http://localhost:8000/health

# Test each service through gateway
curl http://localhost:8000/api/v1/users
curl http://localhost:8000/api/v1/itineraries
curl http://localhost:8000/api/v1/social/comments
```

## Direct Service Access (for debugging)

While the gateway is the recommended access point, services are still accessible directly:

- User Service: `http://localhost:8080/api/v1/users`
- Itinerary Service: `http://localhost:8081/api/v1/itineraries`
- Social Service: `http://localhost:8082/api/v1/social`

**Note**: Frontend and inter-service communication should always use the gateway (port 8000).

## Troubleshooting

### Prisma Schema Cache Issues

If you modify a Prisma schema and encounter errors like "The column does not exist in the current database", you need to clear the Prisma Client cache and rebuild the Docker image:

```bash
# 1. Clear Prisma cache locally and regenerate
cd services/user-service
rm -rf node_modules/.prisma
npx prisma generate

# 2. Remove old containers and images
docker-compose -f docker-compose.microservices.yml down
docker rmi cloudappdev-user-service:latest

# 3. Rebuild image from scratch (clears all caches)
docker-compose -f docker-compose.microservices.yml build --no-cache user-service

# 4. Start services again
docker-compose -f docker-compose.microservices.yml up -d
```

**Why this is needed:** When you modify a Prisma schema, the compiled Prisma Client in `node_modules/@prisma/client` caches the old schema. Docker containers include this cache, so even with database migrations applied, the old schema is still referenced. The `--no-cache` flag forces Docker to rebuild from scratch, and clearing `node_modules/.prisma` ensures a fresh Prisma Client is generated.

**Apply to all services if needed:**
```bash
# Repeat the above for each service that uses Prisma:
cd services/itinerary-service
rm -rf node_modules/.prisma && npx prisma generate
```

### Service Won't Start / Port Already in Use

```bash
# Find and kill process using the port
lsof -i :8000  # API Gateway
lsof -i :8080  # User Service
lsof -i :8081  # Itinerary Service
lsof -i :8082  # Social Service
lsof -i :5433  # PostgreSQL (Users)
lsof -i :5434  # PostgreSQL (Itineraries)
lsof -i :27017 # MongoDB

# Kill the process
kill -9 <PID>

# Or use Docker to forcefully remove containers
docker-compose -f docker-compose.microservices.yml down --remove-orphans
```

### Database Connection Issues

```bash
# Check if database containers are healthy
docker-compose -f docker-compose.microservices.yml ps

# View database logs
docker logs cloudappdev_postgres_users -f
docker logs cloudappdev_mongodb_social -f

# Verify connection strings in .env match docker-compose setup
```
