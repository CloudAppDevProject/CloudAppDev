# 4. DevOps

## 4.1 Environments and Initial Infrastructure Setup

Starting from a blank GCP project, the following steps provision all infrastructure before application deployment.

### Step 1: GCP Project Initialization

The script `terraform/scripts/init-env.sh` prepares the GCP project.

This enables 21 GCP APIs (Compute Engine, GKE, Cloud SQL, Artifact Registry, Secret Manager, Certificate Manager, Firestore, Cloud Storage, IAM, VPC, Load Balancing, DNS, Monitoring, Logging, etc.) and creates a GCS bucket with versioning for Terraform remote state (`gs://cloudappdev-tf-state-dev/`).

### Step 2: Base Infrastructure (Terraform)

```bash
cd terraform/environments/dev
terraform init
terraform apply
```

**Resources created:**

| Resource | Details |
|----------|---------|
| **GKE Autopilot cluster** | Regional cluster in `europe-west1`, fully managed node provisioning |
| **Namespaces** | `free`, `standard`, `default` (shared services) |
| **Cloud SQL instances** | PostgreSQL databases per tier via the `cloudsql` module. Passwords auto-generated and stored in Secret Manager |
| **Firestore databases** | NoSQL databases for social service per tier |
| **Cloud Storage buckets** | Image storage per tier via the `storage` module |
| **Service accounts** | `app-sa`, `tenant-default-sa`, `provisioning-default-sa` with Workload Identity bindings (via `service-account` module) |
| **RBAC ClusterRole** | Provisioning Service permissions for namespace/deployment/secret/gateway management (`rbac.tf`) |
| **Static external IP** | Global IP for the HTTPS load balancer |
| **Gateway API resources** | HTTP and HTTPS listeners with certificate map |
| **Certificate Manager** | Google-managed SSL certificate for `dev.cloudappdev.site` (via `domain` module) |
| **Cloudflare DNS record** | A-record pointing hostname to the static IP |

The infrastructure is organized in reusable Terraform modules:
- `modules/deployment` -- full namespace infrastructure (databases, storage, service accounts)
- `modules/cloudsql` -- PostgreSQL instance with password generation and Secret Manager storage
- `modules/service-account` -- IAM bindings for Cloud SQL, Storage, Firestore, Artifact Registry
- `modules/domain` -- DNS authorization, SSL certificate, certificate map entry
- `modules/storage` -- GCS bucket with lifecycle rules
- `modules/firestore` -- Firestore database provisioning

### Step 3: Tenant Infrastructure State

A second, separate Terraform state is initialized for dynamic tenant provisioning.

State: `gs://cloudappdev-tf-state-dev/env/dev-tenants`

This state is managed automatically by the Provisioning Service at runtime. Keeping it separate from the base state prevents `terraform apply` on base infrastructure from accidentally deleting dynamically provisioned tenant resources.

### Step 4: Container Registry and Secrets

- Docker images are pushed to `europe-west1-docker.pkg.dev/{project}/docker-repo/`
- Database passwords, API keys (JWT, Firebase, SendGrid, Weather API), and service account keys are stored in Google Secret Manager
- The CI/CD pipeline retrieves these secrets and creates Kubernetes Secrets per namespace during deployment

The following diagram illustrates how secrets and configuration data flow from their sources to the deployed services:

![Secret and Configuration Data Flow](../dataflow_diagram.drawio.svg)

### Step 5: First Deployment

The GitHub Actions pipeline (`build-and-push-dev.yml`) performs the initial deployment: builds all service images, pushes them to Artifact Registry, creates namespace secrets from Secret Manager, and deploys via Helm to `free`, `standard`, and `default` namespaces.

After this, the platform is operational at `https://dev.cloudappdev.site`.

---

## 4.2 Pipelines and Release of New Features

### Branching Strategy

The project follows **Git Flow** with three branch types:

```
master (production) ← develop (staging) ← feature/* (development)
```

**Branch Types:**
- **Feature branches** (`feature/*`): Created from `develop`, trigger CI/CD to dev environment, auto-version `0.0.BUILD_NUMBER`
- **Develop branch**: Integration branch, deploys to development cluster, may contain unstable features
- **Master branch**: Production-ready code, semantic versioning `MAJOR.MINOR.PATCH`, requires manual approval

**Rationale**: Isolates production from active development while enabling rapid iteration in dev environment. Feature branches allow parallel development without conflicts.

---

### CI/CD Pipeline Architecture

The pipeline uses **GitHub Actions + Terraform + Helm** to automate builds and deployments with intelligent change detection.

#### Pipeline Triggers

**Automatic Triggers:**
- Push to `develop` or `feature/*` branches
- Changes in application code (`app/**`, `services/**`, `nginx/**`, `Dockerfile`)

**Manual Triggers:**
- Build all services
- Build specific service (dropdown selection)

**Rationale**: Selective builds reduce pipeline time by 60-80% by only building changed services. Manual triggers enable emergency deployments and testing.

---

#### Pipeline Stages

**1. Prepare Stage**
- Detect changed files using path filters
- Generate version number (`0.0.BUILD_NUMBER` for dev, `MAJOR.MINOR.PATCH` for prod)
- Create build matrix with services to build
- Generate short SHA for traceability

**2. Build and Push Stage**
- Parallel Docker builds for all changed services (multi-stage builds for optimization)
- Tag images with `latest`, version number, and `sha-abc1234`
- Push to Google Artifact Registry (europe-west1)
- Add metadata labels (version, environment, git SHA, service ID)

**3. Deploy Stage**
- Authenticate to GKE cluster
- Retrieve secrets from Google Secret Manager (database credentials, API keys)
- Deploy services to tier-specific namespaces using Helm
- Apply tier-based resource limits (CPU, memory, replicas)
- Verify deployment health (rollout status, pod health checks)

**Rationale**: Three-stage pipeline ensures separation of concerns: analyze → build → deploy. Parallel builds maximize efficiency. Health checks prevent broken deployments reaching production.

---

### Multi-Tenant Deployment Strategy

Services deploy to different namespaces based on tenant tier:

| Namespace | Services Deployed | Purpose |
|-----------|-------------------|---------|
| **cloudappdev** | Frontend, API Gateway | Admin/primary namespace |
| **free** | All 5 services (shared) | Free tier tenants share these pods |
| **standard** | All 5 services (shared) | Standard tier tenants share these pods |
| **default** | Tenant Service, Travel Info, Provisioner | Shared services for all tiers |
| **enterprise-*** | All 5 services (dedicated) | Each enterprise tenant gets own namespace |

**Tier-Based Resource Allocation:**

| Tier | CPU | Memory | Replicas | Autoscaling |
|------|-----|--------|----------|-------------|
| **Free** | 50m-200m | 64Mi-128Mi | 1 | Disabled |
| **Standard** | 100m-500m | 128Mi-256Mi | 2-4 | Enabled |
| **Enterprise** | 250m-1000m | 256Mi-512Mi | 3-10 | Enabled |

**Rationale**: Free/Standard tiers share infrastructure to minimize costs (95% reduction vs dedicated). Enterprise tenants get isolated namespaces for performance and security. Resource limits prevent noisy neighbors and ensure fair usage.

**Service Discovery**: API Gateway routes requests to correct namespace via environment variables (`USER_NAMESPACE=${DEPLOYMENT_NAMESPACE}`). Shared services (travel-info, tenant-service) always route to `default` namespace.

---

### Environment-Specific Deployment

**Development Environment:**
- **Trigger**: Push to `develop` or `feature/*`
- **Version**: Auto-increment `0.0.BUILD_NUMBER`
- **Namespaces**: cloudappdev, free, standard
- **Duration**: 10-15 minutes end-to-end
- **Benefits**: Rapid feedback, early integration testing, no production impact

**Production Environment:**
- **Trigger**: Push to `master` (manual approval required)
- **Version**: Semantic versioning with git tags
- **Namespaces**: All (including enterprise)
- **Safety**: Pre-deployment validation, health checks, automatic rollback on failure
- **Duration**: 15-25 minutes with approval gates

**Rationale**: Separate clusters prevent development changes from affecting production. Automatic dev deployment enables fast iteration. Manual production approval adds safety gate for critical changes.

---

### Pipeline Optimizations

**Build Optimizations:**
- Docker layer caching (50-70% faster builds)
- Multi-stage builds (image size reduced 300MB → 150MB)
- Parallel service builds
- Selective builds (only changed services)

**Deployment Optimizations:**
- Helm release management (automatic cleanup of stuck releases)
- Idempotent namespace provisioning
- Rolling updates (zero-downtime deployments)
- Progressive rollout for production

**Rationale**: Optimizations reduce pipeline time from 30+ minutes to 10-15 minutes for typical changes. Faster feedback improves developer productivity. Zero-downtime deployments maintain service availability.

---

## 4.3 Creation of New Tenants

### Overview

Tenant provisioning is **fully automated** via the **Provisioning Service** (NestJS microservice). The process varies by tier:
- **Free/Standard**: Lightweight provisioning (SSL + routing only)
- **Enterprise**: Full infrastructure provisioning (dedicated namespace + databases + services)


### Tenant Creation Workflow

The following diagram illustrates the complete tenant registration and provisioning workflow:

![Tenant Registration Process](../diagrams/registration.drawio.svg)

---

### Tenant Creation Workflow

**Phase 1: User Registration (Manual - ~5 minutes)**

1. **Register Organization**: User provides organization name and contact info
2. **Choose Plan**: Select tier (Free/Standard/Enterprise)
3. **Specify Subdomain**: User chooses subdomain (e.g., `acme-corp.dev.cloudappdev.site`)
4. **Create Admin Credentials**: Set password for admin account

**Phase 2: Infrastructure Provisioning (Automatic - 2-15 minutes)**

5. **Provision Infrastructure**: Provisioning Service executes Terraform + Kubernetes deployments
   - Updates `tenants.tfvars` with new tenant
   - Runs `terraform apply` to create cloud resources
   - Deploys Kubernetes resources (namespace or HTTPRoute)
   
6. **Tier-Specific Provisioning**:
   - **Enterprise**: Creates dedicated namespace with all services
   - **Free/Standard**: Creates HTTPRoute to shared namespace

7. **Save Tenant Data**: Stores tenant UUID and metadata in database
8. **Create Admin User**: Hashes password and associates with tenant ID

**Phase 3: User Onboarding (Manual - ~5 minutes)**

9. **Login**: Admin user accesses tenant-specific subdomain
10. **Configure Organization**: Set organization settings and preferences
11. **Invite Users**: Additional users register on tenant subdomain

**Rationale**: Only ~10 minutes of manual user interaction required. All complex infrastructure provisioning (the time-consuming part) is fully automated, reducing time-to-market and eliminating human error.

---

### Tier-Specific Provisioning

#### Free/Standard Tier Provisioning (~2 minutes)

**Infrastructure Created via Terraform:**
- Cloudflare DNS record (subdomain)
- Google-managed SSL certificate
- Certificate mapping to load balancer

**Kubernetes Resources Created:**
- HTTPRoute pointing to shared namespace services
- No dedicated pods, databases, or storage

**Resource Usage**: Shares existing pods in `free` or `standard` namespace. Tenant isolation via application-layer filtering (tenant ID).

**Cost**: ~€0/month (shared infrastructure)

**Rationale**: Lightweight provisioning enables unlimited free/standard tenants at near-zero marginal cost. Shared infrastructure maximizes resource utilization while HTTPRoute provides SSL and domain isolation.

---

#### Enterprise Tier Provisioning (~10-15 minutes)

**Infrastructure Created via Terraform:**
- Cloudflare DNS record
- Google-managed SSL certificate
- **2× Cloud SQL PostgreSQL databases** (users, itinerary)
- **Firestore database** (social service)
- **Cloud Storage bucket** (image uploads)
- Database credentials stored in Google Secret Manager

**Kubernetes Resources Created:**
- **Dedicated namespace** (`acme-corp`)
- **5 microservices deployed**:
  - User Service (port 8080)
  - Itinerary Service (port 8081)
  - Social Service (port 8082)
  - Frontend/Next.js (port 80)
  - API Gateway/NGINX (port 8000)
- **Kubernetes secrets** (database URLs, JWT secrets, API keys)
- **HTTPRoute** routing subdomain to namespace services
- **Autoscaling** (2-20 replicas per service)

**Cost**: ~€150/month (dedicated infrastructure)

**Rationale**: Dedicated infrastructure provides performance isolation, scalability, and security for enterprise customers. Higher costs justified by premium pricing (€249+/month). Full namespace isolation enables custom configurations and SLA guarantees.

---

### Provisioning Service Implementation

**API Endpoint**: `POST /provision-tenant`

**Execution Flow:**

1. **Sanitize Tenant Name**: Convert to lowercase, remove invalid characters
2. **Update Terraform Config**: Add tenant to `tenants.tfvars`
3. **Run Terraform Apply**: Provision cloud resources (DNS, SSL, databases, storage)
4. **Conditional Deployment**:
   - **Enterprise**: Deploy full namespace via Helm (5 services × Helm charts)
   - **Free/Standard**: Deploy HTTPRoute only via Helm
5. **Return Response**: Success/failure with infrastructure details

**Error Handling & Rollback:**
- **Terraform Failure**: Remove tenant from `tenants.tfvars` (no infrastructure created)
- **Kubernetes Failure**: Remove tenant from `tenants.tfvars` (may leave orphaned cloud resources)
- **Retry Logic**: Terraform state lock conflicts retry with 10-second backoff
- **Logging**: All errors logged with full context (tenant ID, tier, stage, stack trace)

**Rationale**: Single API endpoint handles complex multi-step provisioning. Automatic rollback ensures clean state on failure. Retry logic handles transient errors. Comprehensive logging enables troubleshooting.

---

### Tier Comparison Summary

| Aspect | Free | Standard | Enterprise |
|--------|------|----------|------------|
| **Provisioning Time** | ~2 min | ~2 min | ~10-15 min |
| **Infrastructure** | SSL + DNS | SSL + DNS | SSL + DNS + DB + Storage + Namespace |
| **Kubernetes** | HTTPRoute only | HTTPRoute only | Dedicated namespace (5 services) |
| **Database** | Shared | Shared | Dedicated PostgreSQL + Firestore |
| **Storage** | Shared bucket | Shared bucket | Dedicated bucket |
| **Namespace** | Shared (`free`) | Shared (`standard`) | Dedicated (`tenantName`) |
| **Replicas** | 1 (shared) | 1-5 (shared) | 2-20 (dedicated) |
| **Resource Isolation** | Application-level | Application-level | Namespace + infrastructure |

---

### Benefits of Implementation

**1. Full Automation**: Single API call provisions complete tenant infrastructure (no manual Terraform or kubectl commands)

**2. Cost Optimization**: Free/Standard tiers share infrastructure (95% cost reduction vs dedicated). Enterprise tier pays for dedicated resources.

**3. Scalability**: Can provision thousands of free/standard tenants. Enterprise tenants scale independently with autoscaling.

**4. Security**: Namespace isolation (Enterprise), unique database credentials, secrets stored in Secret Manager.

**5. Reliability**: Comprehensive rollback on failure, retry logic for transient errors, health checks verify successful deployment.

**6. Developer Experience**: Simple API, rich error messages, async processing.

**7. Business Enablement**: Freemium strategy (low-cost free tier), clear upgrade path (free → standard → enterprise), resource accountability per tier.

---

### Summary

**CI/CD Pipeline**: Intelligent build system that only builds changed services, deploys to tier-specific namespaces with appropriate resource limits, and verifies health before completion. Development pipeline provides rapid feedback (10-15 min), production pipeline adds safety gates.

**Tenant Provisioning**: Fully automated infrastructure provisioning that adapts to tenant tier. Free/Standard tenants provision in ~2 minutes with shared infrastructure. Enterprise tenants provision in ~10-15 minutes with dedicated infrastructure. Only ~10 minutes of manual user interaction required for complete onboarding.

### Service Health Monitoring

All microservices expose a `/health` endpoint that returns service status. GKE uses these for Kubernetes probes:

| Probe | Purpose | Configuration |
|-------|---------|---------------|
| **Startup Probe** | Waits for service initialization | HTTP GET `/health`, failure threshold 30, period 10s |
| **Liveness Probe** | Restarts unresponsive pods | HTTP GET `/health`, failure threshold 3, period 30s |
| **Readiness Probe** | Removes pod from traffic if unhealthy | HTTP GET `/health`, failure threshold 3, period 10s |

The API Gateway also exposes a `/health` endpoint that verifies its own availability.

### CI/CD Pipeline Monitoring

The GitHub Actions pipeline provides deployment-level observability:
- Build status per service (success/failure/skipped)
- Deployment rollout verification via `kubectl rollout status`
- Pod health checks after each deployment
- Helm release status tracking with stuck release detection and cleanup