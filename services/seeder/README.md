# Unified Seeder Service

## Overview

This is a **dedicated seeding container** that runs as a Kubernetes Job to populate all microservice databases with test data. It solves the ID dependency problem by having direct access to all databases and managing ID mappings internally.

## Architecture Decision

### Why a Dedicated Seeder Container?

After evaluating multiple approaches, we chose this solution because it:

✅ **Simple & Reliable**: One container, one script, no complex orchestration  
✅ **Fast**: Direct database access without API overhead  
✅ **Secure**: Uses existing Kubernetes secrets, no new infrastructure  
✅ **Quality**: Maintains the same high-quality seeding as local development  
✅ **ID Management**: Handles foreign key dependencies internally with in-memory mappings  
✅ **12-Factor Compliant**: Configuration via environment variables, stateless execution  

### Rejected Alternatives

❌ **API Gateway Orchestration** - Authentication complexity, network overhead  
❌ **Per-Service Kubernetes Jobs** - Complex ID exchange via shared volumes  
❌ **Frontend-Driven Seeding** - Doesn't reflect real architecture, auth issues  

## How It Works

```
┌─────────────────────────────────────────────┐
│     Kubernetes Job: cloudappdev-seeder      │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │  1. Load seed-data/dataset.json    │   │
│  │  2. Connect to all 3 databases     │   │
│  │  3. Seed users → collect IDs       │   │
│  │  4. Seed itineraries (use user IDs)│   │
│  │  5. Seed social (use all IDs)      │   │
│  └────────────────────────────────────┘   │
│                                             │
│  Environment Variables (from secrets):     │
│  • USER_DATABASE_URL                       │
│  • ITINERARY_DATABASE_URL                  │
│  • SOCIAL_MONGODB_URI                      │
└─────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   PostgreSQL      PostgreSQL       MongoDB
   (users)       (itineraries)     (social)
```

## Project Structure

```
services/seeder/
├── Dockerfile           # Multi-stage build with Prisma clients
├── package.json         # Dependencies (Prisma, MongoDB driver)
├── seed.js              # Main seeding script
└── README.md            # This file
```

## Usage

### Local Development

```bash
# From repo root
cd services/seeder

# Set environment variables
export USER_DATABASE_URL="postgresql://..."
export ITINERARY_DATABASE_URL="postgresql://..."
export SOCIAL_MONGODB_URI="mongodb://..."

# Run seeding
npm run seed
```

### Kubernetes Deployment

```bash
# Build and push image
docker build -f services/seeder/Dockerfile -t europe-west1-docker.pkg.dev/PROJECT_ID/docker-repo/seeder:latest .
docker push europe-west1-docker.pkg.dev/PROJECT_ID/docker-repo/seeder:latest

# Apply Kubernetes Job
kubectl apply -f k8s/seeding-job.yaml

# Watch job progress
kubectl logs -f job/cloudappdev-seeder

# Check job status
kubectl get jobs
kubectl describe job cloudappdev-seeder
```

### Terraform Integration (Recommended)

Add to your `terraform/main.tf`:

```hcl
resource "kubernetes_job" "seeder" {
  metadata {
    name      = "cloudappdev-seeder"
    namespace = "default"
  }

  spec {
    backoff_limit = 0
    ttl_seconds_after_finished = 3600

    template {
      metadata {
        labels = {
          app = "cloudappdev-seeder"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.cloudappdev.metadata[0].name
        restart_policy       = "Never"

        container {
          name  = "seeder"
          image = "europe-west1-docker.pkg.dev/${var.project_id}/docker-repo/seeder:latest"

          env {
            name = "USER_DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.cloudappdev.metadata[0].name
                key  = "user-database-url"
              }
            }
          }

          env {
            name = "ITINERARY_DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.cloudappdev.metadata[0].name
                key  = "itinerary-database-url"
              }
            }
          }

          env {
            name = "SOCIAL_MONGODB_URI"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.cloudappdev.metadata[0].name
                key  = "social-mongodb-uri"
              }
            }
          }

          resources {
            requests = {
              memory = "256Mi"
              cpu    = "250m"
            }
            limits = {
              memory = "512Mi"
              cpu    = "500m"
            }
          }
        }
      }
    }
  }

  # Only run after databases are ready
  depends_on = [
    google_sql_database_instance.user_db,
    google_sql_database_instance.itinerary_db,
    # Add your MongoDB instance dependency
  ]
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `USER_DATABASE_URL` | Yes | PostgreSQL connection string for user-service |
| `ITINERARY_DATABASE_URL` | Yes | PostgreSQL connection string for itinerary-service |
| `SOCIAL_MONGODB_URI` | Yes | MongoDB connection string for social-service |
| `SEED_DATA_PATH` | No | Path to dataset.json (default: `/app/seed-data/dataset.json`) |

## Seed Data Format

The seeder expects a `seed-data/dataset.json` file with this structure:

```json
{
  "users": [
    {
      "key": "emma-rodriguez",
      "name": "Emma Rodriguez",
      "email": "emma.rodriguez@example.com",
      "password": "password123"
    }
  ],
  "itineraries": [
    {
      "key": "discover-ancient-rome",
      "userKey": "emma-rodriguez",
      "title": "Discovering Ancient Rome",
      "destination": "Rome, Italy",
      "start_date": "2025-03-15",
      "locations": [...]
    }
  ],
  "social": {
    "comments": [
      {
        "userKey": "liam-chen",
        "itineraryKey": "discover-ancient-rome",
        "text": "Rome is absolutely magical!"
      }
    ],
    "likes": [
      {
        "userKey": "sofia-andersson",
        "itineraryKey": "discover-ancient-rome"
      }
    ]
  }
}
```

**Key Features**:
- Uses `key` fields (e.g., `"emma-rodriguez"`) for referential integrity
- Seeder maintains in-memory mapping: `key → database ID`
- No need to know actual database IDs in advance

## Troubleshooting

### Job Failed

```bash
# Check logs
kubectl logs job/cloudappdev-seeder

# Check job events
kubectl describe job cloudappdev-seeder

# Delete and retry
kubectl delete job cloudappdev-seeder
kubectl apply -f k8s/seeding-job.yaml
```

### Database Connection Errors

Verify secrets exist and are correct:

```bash
kubectl get secrets cloudappdev-secrets
kubectl describe secret cloudappdev-secrets
```

### Missing Dataset

Ensure `seed-data/dataset.json` exists in the repository before building the image.

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/build-seeder.yml
name: Build and Push Seeder Image

on:
  push:
    paths:
      - 'services/seeder/**'
      - 'seed-data/**'
      - 'services/user-service/prisma/**'
      - 'services/itinerary-service/prisma/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}
      
      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker europe-west1-docker.pkg.dev
      
      - name: Build and Push
        run: |
          docker build -f services/seeder/Dockerfile \
            -t europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/docker-repo/seeder:latest \
            -t europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/docker-repo/seeder:${{ github.sha }} \
            .
          docker push europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/docker-repo/seeder:latest
          docker push europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/docker-repo/seeder:${{ github.sha }}
```

## Security Considerations

- ✅ Runs as non-root user (`USER node`)
- ✅ Uses Kubernetes secrets for sensitive data
- ✅ Resource limits prevent runaway processes
- ✅ Job TTL cleans up completed jobs automatically
- ✅ `backoffLimit: 0` prevents automatic retries (manual review required)

## Benefits Over Other Approaches

| Approach | Complexity | Speed | Auth Required | ID Management | Quality |
|----------|-----------|-------|---------------|---------------|---------|
| **Unified Seeder** | ⭐ Low | ⚡ Fast | ❌ No | ✅ Built-in | ⭐⭐⭐⭐⭐ |
| API Orchestration | ⭐⭐⭐ High | 🐢 Slow | ✅ Yes | ⚠️ Complex | ⭐⭐⭐ |
| Per-Service Jobs | ⭐⭐⭐⭐ Very High | ⚡ Fast | ❌ No | ⚠️ Shared Volume | ⭐⭐⭐⭐ |

## Future Enhancements

- [ ] Add data validation before seeding
- [ ] Support incremental seeding (add without clearing)
- [ ] Generate synthetic data for load testing
- [ ] Export seeded IDs for E2E test fixtures
- [ ] Add dry-run mode (validate without writing)

## License

Part of the CloudAppDev project (HTWG Konstanz, Winter 2025/26)
