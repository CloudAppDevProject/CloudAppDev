# Seeder Quickstart Guide

## 🚀 TL;DR

**What**: Unified seeding container that populates all microservice databases  
**Why**: Solves ID dependency problem in distributed architecture  
**How**: Direct database access with in-memory ID mapping

## Local Testing (Development)

```bash
# 1. Ensure databases are running
docker-compose -f docker-compose.microservices.yml up -d

# 2. Generate Prisma clients for all services (REQUIRED FIRST TIME)
# From repo root:
cd services/user-service && npx prisma generate && cd ../..
cd services/itinerary-service && npx prisma generate && cd ../..

# 3. Install seeder dependencies
cd services/seeder
npm install

# 4. Set environment variables
export USER_DATABASE_URL="postgresql://appuser:devpass123@localhost:5433/users_db"
export ITINERARY_DATABASE_URL="postgresql://appuser:devpass123@localhost:5434/itineraries_db"
export SOCIAL_MONGODB_URI="mongodb://admin:mongopass123@localhost:27017/social_db"

# 5. Run seeding
npm run seed

# Note: The seeder automatically detects if running locally vs. in container
# Local:     Uses ../../seed-data/dataset.json
# Container: Uses /app/seed-data/dataset.json
```

## Production Deployment (Kubernetes)

### One-Time Setup

```bash
# 1. Build and push image
docker build -f services/seeder/Dockerfile \
  -t europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/docker-repo/seeder:latest .
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/docker-repo/seeder:latest

# 2. Update k8s/seeding-job.yaml with your PROJECT_ID

# 3. Ensure secrets exist
kubectl get secret cloudappdev-secrets -o yaml
```

### Run Seeding Job

```bash
# Deploy job
kubectl apply -f k8s/seeding-job.yaml

# Watch logs
kubectl logs -f job/cloudappdev-seeder

# Check status
kubectl get jobs
kubectl describe job cloudappdev-seeder
```

### Clean Up After Seeding

```bash
# Job auto-deletes after 1 hour (ttlSecondsAfterFinished: 3600)
# Or manually delete:
kubectl delete job cloudappdev-seeder
```

## Troubleshooting

### Local Testing: "Cannot find dataset.json"

```bash
# Error: ENOENT: no such file or directory
# Solution: Ensure seed-data/dataset.json exists in repo root

# Check if file exists:
ls ../../seed-data/dataset.json  # from services/seeder/

# If missing, you may need to create it or pull from git
```

### Local Testing: "Cannot find Prisma Client"

```bash
# Error: Cannot find module '../user-service/node_modules/.prisma/client'
# Solution: Generate Prisma clients first

cd services/user-service && npx prisma generate
cd services/itinerary-service && npx prisma generate

# Then retry: cd services/seeder && npm run seed
```

### Local Testing: MongoDB Schema Validation Errors

```bash
# If you see errors about missing fields:
# - Check that MongoDB schemas match seeder output
# - Recent fix changed field names from snake_case to camelCase
# - Comments: userId, itineraryId, text (NOT user_id, itinerary_id, content)
# - Likes: userId, itineraryId (NOT user_id, itinerary_id)

# To verify MongoDB collections after seeding:
mongosh "mongodb://admin:mongopass123@localhost:27017/social_db"
db.comments.findOne()
db.likes.findOne()
```

### Kubernetes: Job Fails Immediately

```bash
# Check logs
kubectl logs job/cloudappdev-seeder

# Common issues:
# 1. Missing secrets → kubectl get secret cloudappdev-secrets
# 2. Wrong database URLs → check secret values
# 3. Databases not ready → check database pods
# 4. Image not found → verify image was pushed to Artifact Registry
```

### Connection Errors

```bash
# Verify database connectivity from within cluster
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -- \
  psql "postgresql://user:pass@host:5432/db"
```

### Re-run Seeding

```bash
# Delete job and re-apply
kubectl delete job cloudappdev-seeder
kubectl apply -f k8s/seeding-job.yaml
```

## CI/CD Integration

The seeder image is automatically built and pushed via GitHub Actions:

**Trigger**:
- Push to `master` branch
- Changes to `services/seeder/**`
- Changes to `seed-data/**`
- Changes to Prisma schemas

**Workflow**: `.github/workflows/build-and-push-seeder.yml`

## Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `USER_DATABASE_URL` | ✅ | `postgresql://user:pass@host:5433/users_db` |
| `ITINERARY_DATABASE_URL` | ✅ | `postgresql://user:pass@host:5434/itineraries_db` |
| `SOCIAL_MONGODB_URI` | ✅ | `mongodb://user:pass@host:27017/social_db` |
| `SEED_DATA_PATH` | ❌ | `/app/seed-data/dataset.json` (default) |

## Updating Seed Data

1. Edit `seed-data/dataset.json`
2. Commit and push
3. Rebuild image (CI/CD or manual)
4. Re-run Kubernetes Job

## Maintenance: When Service Schemas Change

### User Service Prisma Schema Changes

```bash
# 1. Update schema in services/user-service/prisma/schema.prisma
# 2. Run migrations in user-service
cd services/user-service
npx prisma migrate dev --name your_migration_name

# 3. Regenerate Prisma client locally
npx prisma generate

# 4. Update seeder logic in services/seeder/seed.js if needed

# 5. Commit and push - CI/CD will automatically:
#    - Copy updated schema to seeder Dockerfile
#    - Run npx prisma generate in container
#    - Rebuild and push seeder image

# 6. Re-run seeding job in Kubernetes
kubectl delete job cloudappdev-seeder
kubectl apply -f k8s/seeding-job.yaml
```

### Itinerary Service Prisma Schema Changes

```bash
# Same process as User Service:
cd services/itinerary-service
npx prisma migrate dev --name your_migration_name
npx prisma generate

# Update seeder/seed.js if field mappings changed
# Commit + push → CI/CD rebuilds seeder automatically
```

### Social Service MongoDB Schema Changes

```bash
# 1. Update schemas in services/social-service/src/schemas/
#    - comment.schema.ts
#    - like.schema.ts

# 2. Update seeder logic in services/seeder/seed.js
#    IMPORTANT: Match field names exactly!
#    - Comments: userId, itineraryId, text, createdAt, updatedAt
#    - Likes: userId, itineraryId, createdAt

# 3. Test locally first:
cd services/seeder
npm run seed

# 4. Verify data in MongoDB:
mongosh "mongodb://admin:mongopass123@localhost:27017/social_db"
db.comments.findOne()  # Check field names match
db.likes.findOne()

# 5. Commit + push
# Note: No Prisma generation needed for MongoDB, 
# but seeder image still needs rebuild to include new logic
```

### CI/CD Automation

The seeder image is **automatically rebuilt** when you change:
- `services/seeder/**` (seeder code)
- `seed-data/**` (seed data)
- `services/user-service/prisma/**` (user schema)
- `services/itinerary-service/prisma/**` (itinerary schema)

**Workflow:** `.github/workflows/build-and-push-seeder.yml`

**No manual sync required!** The Dockerfile copies schemas at build time.

## Architecture

```
Kubernetes Job (seeder)
    ↓
    ├── Connect to PostgreSQL (user-service)
    ├── Connect to PostgreSQL (itinerary-service)
    └── Connect to MongoDB (social-service)
    ↓
    1. Load dataset.json
    2. Seed users → store {key: id} mapping
    3. Seed itineraries → use user IDs
    4. Seed social → use user + itinerary IDs
```

## Files

- **`services/seeder/seed.js`** - Main seeding logic
- **`services/seeder/Dockerfile`** - Container build
- **`services/seeder/package.json`** - Dependencies
- **`seed-data/dataset.json`** - Seed data
- **`k8s/seeding-job.yaml`** - Kubernetes Job manifest
- **`SEEDING.md`** - Full documentation

## Support

For detailed documentation:
- **Full Guide**: `SEEDING_FINAL.md` (repo root) - Comprehensive implementation guide
- **Architecture**: `services/seeder/README.md` - Design decisions and overview
- **Maintenance**: `services/seeder/MAINTENANCE.md` - Schema change procedures
