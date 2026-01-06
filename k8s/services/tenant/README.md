# Tenant Service - Kubernetes Deployment

**Version:** 1.0.0
**Service Port:** 8084
**Database:** Cloud SQL PostgreSQL

---

## Quick Start

### Deploy to Development

```bash
# 1. Create secret (if not exists)
kubectl create secret generic tenant-service-secrets \
  --from-literal=NODE_ENV=development \
  --from-literal=DATABASE_URL="postgresql://user:pass@localhost:5432/tenant_db"

# 2. Deploy with Helm
helm upgrade --install tenant-service . \
  -f values-dev.yaml \
  --namespace default

# 3. Verify deployment
kubectl get pods -l app.kubernetes.io/name=tenant
kubectl logs -l app.kubernetes.io/name=tenant --tail=50
```

### Deploy to Production

```bash
# 1. Create secret (if not exists)
kubectl create secret generic tenant-service-secrets \
  --from-literal=NODE_ENV=production \
  --from-literal=DATABASE_URL="postgresql://user:pass@localhost:5432/tenant_db" \
  --namespace production

# 2. Deploy with Helm
helm upgrade --install tenant-service . \
  -f values-prod.yaml \
  --namespace production

# 3. Verify deployment
kubectl get pods -l app.kubernetes.io/name=tenant -n production
kubectl logs -l app.kubernetes.io/name=tenant -n production --tail=50
```

---

## Helm Chart Structure

```
k8s/services/tenant/
├── Chart.yaml                    # Helm chart metadata (v1.0.0)
├── values-dev.yaml              # Development environment values
├── values-prod.yaml             # Production environment values
├── README.md                    # This file
└── templates/
    ├── _helpers.tpl             # Template helper functions
    ├── deployment.yaml          # Deployment with Cloud SQL proxy
    ├── service.yaml             # LoadBalancer service (port 8084)
    ├── serviceaccount.yaml      # GCP service account binding
    └── hpa.yaml                 # Horizontal Pod Autoscaler
```

---

## Configuration

### Environment Values

**Development (`values-dev.yaml`):**
- Image: `cloudappdev-tenant-service:latest`
- CPU: 250m, Memory: 512Mi
- Replicas: 1-5 (autoscaling at 75% CPU)
- Cloud SQL: `oceanic-citadel-474512-c1:europe-west1:cloudappdev-tf-tenant-db`

**Production (`values-prod.yaml`):**
- Image: `cloudappdev-tenant-service:latest`
- CPU: 500m, Memory: 1Gi
- Replicas: 2-10 (autoscaling at 70% CPU)
- Cloud SQL: Same instance (configured per environment)

### Required Secrets

Create Kubernetes secret before deploying:

```bash
kubectl create secret generic tenant-service-secrets \
  --from-literal=NODE_ENV=production \
  --from-literal=DATABASE_URL="postgresql://user:password@localhost:5432/tenant_db?schema=public"
```

**Required Keys:**
- `NODE_ENV` - Environment name (development, staging, production)
- `DATABASE_URL` - PostgreSQL connection string

### Cloud SQL Connection

The deployment uses **Cloud SQL Proxy** as an init container:

**Development:**
```yaml
initContainers:
  - name: cloud-sql-proxy
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1
    args:
      - "--port=5432"
      - "oceanic-citadel-474512-c1:europe-west1:cloudappdev-tf-tenant-db"
```

**Update for your project:**
Replace `oceanic-citadel-474512-c1:europe-west1:cloudappdev-tf-tenant-db` with your Cloud SQL instance connection name.

---

## Automatic Database Seeding

The Tenant Service **automatically seeds the database on startup**:

**What Gets Seeded:**
1. **Roles:**
   - ID 1: "user" (Regular user with basic permissions)
   - ID 2: "admin" (Administrator with full permissions)

2. **Default Tenant:**
   - ID 1: "Free Community"
   - Tier: "free"
   - Max Users: 999999 (unlimited)

**Seeding Flow:**
```
Container Start
    ↓
Cloud SQL Proxy (init container)
    ↓
Prisma Migrate Deploy
    ↓
Automatic Seeding (node dist/seed)
    ↓
NestJS Service Start
```

**Idempotent:** Safe to run multiple times, checks if entities exist before creating.

**Logs to Watch For:**
```
🌱 Starting automatic database seeding...
📋 Seeding roles...
  ✓ Created role 'user' (ID: 1)
  ✓ Created role 'admin' (ID: 2)
🏢 Seeding default tenant...
  ✓ Created default tenant: Free Community (ID: 1)
✅ Automatic database seeding completed successfully!
🎉 Database is ready!
```

---

## Health Checks

### Startup Probe
```yaml
startupProbe:
  tcpSocket:
    port: 8084
  initialDelaySeconds: 10
  failureThreshold: 30
  periodSeconds: 2
```

**Purpose:** Allows time for migrations + seeding before marking pod as ready.

### Liveness Probe
```yaml
livenessProbe:
  tcpSocket:
    port: 8084
  initialDelaySeconds: 30
  periodSeconds: 10
```

**Purpose:** Restarts pod if service becomes unresponsive.

---

## Horizontal Pod Autoscaling

**Development:**
- Min Replicas: 1
- Max Replicas: 5
- Target CPU: 75%

**Production:**
- Min Replicas: 2
- Max Replicas: 10
- Target CPU: 70%

**View HPA Status:**
```bash
kubectl get hpa
kubectl describe hpa tenant-service
```

---

## Common Operations

### View Logs

```bash
# All pods
kubectl logs -l app.kubernetes.io/name=tenant --tail=100

# Specific pod
kubectl logs tenant-service-<pod-id> --tail=100

# Follow logs
kubectl logs -l app.kubernetes.io/name=tenant -f

# Cloud SQL Proxy logs
kubectl logs -l app.kubernetes.io/name=tenant -c cloud-sql-proxy
```

### Scale Manually

```bash
# Scale to 3 replicas
kubectl scale deployment tenant-service --replicas=3

# Watch scaling
kubectl get pods -l app.kubernetes.io/name=tenant -w
```

### Update Image

```bash
# Set new image version
kubectl set image deployment/tenant-service \
  tenant=europe-west1-docker.pkg.dev/YOUR_PROJECT/docker-repo/cloudappdev-tenant-service:0.2.0

# Watch rollout
kubectl rollout status deployment/tenant-service

# Rollback if needed
kubectl rollout undo deployment/tenant-service
```

### Delete Deployment

```bash
# Uninstall with Helm
helm uninstall tenant-service

# Or delete manually
kubectl delete deployment tenant-service
kubectl delete service tenant-service
kubectl delete hpa tenant-service
kubectl delete serviceaccount tenant-service-sa
```

---

## Troubleshooting

### Pod Crashes Immediately (CrashLoopBackOff)

**Check logs:**
```bash
kubectl logs -l app.kubernetes.io/name=tenant --previous
```

**Common causes:**
- Database connection failed (check DATABASE_URL secret)
- Cloud SQL proxy failed (check instance connection name)
- Migrations failed (check Prisma schema)

### Seeding Fails

**Symptoms:** Error in logs during seed phase

**Solution:**
```bash
# Check seed script logs
kubectl logs -l app.kubernetes.io/name=tenant | grep "🌱"

# Connect to database and verify
kubectl exec -it deployment/tenant-service -- \
  psql $DATABASE_URL -c "SELECT * FROM \"Role\";"
```

### Startup Probe Timeout

**Symptoms:** Pod marked unhealthy, restarts repeatedly

**Cause:** Seeding takes too long

**Solution:** Increase startup probe timeout in values file:
```yaml
startupProbe:
  initialDelaySeconds: 30
  failureThreshold: 60
```

### Can't Connect to Service

**Check service status:**
```bash
kubectl get svc tenant-service
kubectl describe svc tenant-service
```

**Test from within cluster:**
```bash
kubectl run test-pod --rm -it --image=curlimages/curl -- \
  curl http://tenant-service:8084/api/v1/tenants
```

---

## Service Endpoints

**Kubernetes Service:**
- Internal: `http://tenant-service:8084`
- External: LoadBalancer IP on port 8084

**API Routes:**
- `GET /api/v1/tenants` - List all tenants
- `GET /api/v1/tenants/:id` - Get tenant by ID
- `POST /api/v1/tenants` - Create new tenant
- `PATCH /api/v1/tenants/:id` - Update tenant
- `DELETE /api/v1/tenants/:id` - Delete tenant
- `GET /api/v1/roles` - List all roles
- `GET /api/v1/user-roles/user/:userId` - Get user's roles
- `POST /api/v1/user-roles` - Assign role to user

---

## Production Checklist

Before deploying to production:

- [ ] Create production Kubernetes secret with correct DATABASE_URL
- [ ] Update Cloud SQL instance connection name in `values-prod.yaml`
- [ ] Verify GCP service account has Cloud SQL Client role
- [ ] Test seeding in staging environment first
- [ ] Configure monitoring and alerting
- [ ] Set up backup strategy for database
- [ ] Document rollback procedure
- [ ] Test horizontal pod autoscaling
- [ ] Verify health checks are working

---

## Related Documentation

- [Automatic Seeding Deployment Guide](../../../docs/AUTOMATIC_SEEDING_DEPLOYMENT.md)
- [Tenant Service README](../../../services/tenant-service/README.md)
- [Milestone 3 Complete Checklist](../../../docs/MILESTONE3_COMPLETE_CHECKLIST.md)

---

## Support

For issues or questions:
1. Check logs: `kubectl logs -l app.kubernetes.io/name=tenant`
2. Review troubleshooting section above
3. Consult deployment documentation
4. Check Cloud SQL connectivity
