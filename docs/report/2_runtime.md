# 2 Runtime View

## 2.1 Runtime Overview

<!-- TODO: Add cloud resource diagram -->

**Cloud Resources (GCP):**

| Resource | Service | Configuration |
|----------|---------|---------------|
| **GKE Autopilot** | Compute | Regional cluster (`europe-west1`), automatic node provisioning and scaling |
| **Cloud SQL (PostgreSQL 16)** | Database | Shared instances for Free/Standard tiers; dedicated instances per Enterprise tenant |
| **MongoDB** | Database | Self-managed on GKE for social data (comments, likes, newsletter) |
| **Cloud Storage** | Object Storage | Regional buckets for image uploads. Shared bucket for Free/Standard, dedicated per Enterprise |
| **Artifact Registry** | Container Registry | `europe-west1-docker.pkg.dev` hosts all Docker images |
| **Secret Manager** | Secrets | Stores database credentials, API keys, Firebase keys per namespace/tenant |
| **Certificate Manager** | SSL/TLS | Google-managed certificates for all tenant subdomains |
| **Cloud DNS / Cloudflare** | DNS | Subdomain routing: `{tenant}.dev.cloudappdev.site` |

**API Gateway (Nginx):**

The Nginx API Gateway is the single entry point for all backend traffic. It runs as a pod in each namespace and routes requests by path prefix:

| Path | Target Service | Port |
|------|---------------|------|
| `/api/v1/auth`, `/api/v1/users` | User Service | 8080 |
| `/api/v1/itineraries` | Itinerary Service | 8081 |
| `/api/v1/social` | Social Service | 8082 |
| `/api/v1/travel-info` | Travel Info Service | 8083 |
| `/api/v1/tenants` | Tenant Service | 8084 |
| `/health` | Gateway self-check | -- |

The gateway uses namespace-scoped environment variables (`USER_NAMESPACE`, `ITINERARY_NAMESPACE`, etc.) to resolve service DNS names dynamically, enabling the same image to serve different namespaces. Client body size is set to 50 MB for image uploads. The Social Service has a 120-second timeout for newsletter batch operations.

**Synchronous Services:**

The Next.js frontend and all NestJS microservices operate synchronously via REST. Client requests flow: Browser -> Next.js server-side API proxy routes -> API Gateway -> target microservice. The server-side proxy ensures the API Gateway URL is never exposed to the browser.

**Asynchronous Services:**

The Email Newsletter runs as a Kubernetes CronJob (every Sunday at 20:00 UTC). It calls the Social Service's `/newsletter/send-weekly` endpoint, which processes users in batches of 50 with 5 concurrent email sends. Failed sends are retried with exponential backoff (up to 3 retries). Delivery status is tracked in MongoDB.

**Running Application:**

- Production: `https://{tenant}.dev.cloudappdev.site`
- GCP Console: Google Cloud Console for project `cloudappdev-dev`

## 2.2 Microservices

### User Service (Port 8080)

**Purpose:** User registration, authentication, and profile management.

**Runtime Configuration:**
- NestJS application with `@nestjs/config` for environment variables
- Firebase Admin SDK verifies authentication tokens
- Prisma ORM connects to PostgreSQL (Cloud SQL via Cloud SQL Proxy sidecar)
- JWT secret per namespace for token signing

**Scaling:**
- Free: 1 replica, no autoscaling
- Standard: 1-5 replicas, HPA at 75% CPU
- Enterprise: 2-20 replicas, HPA at 70% CPU

**Security:**
- Firebase token verification on protected endpoints
- Passwords hashed with bcrypt
- Database credentials injected via Kubernetes Secrets (sourced from Google Secret Manager)
- Cloud SQL Proxy handles encrypted database connections

**External Connections:** Cloud SQL (PostgreSQL), Firebase Auth, Google Cloud Storage (avatar uploads)

**Multi-Tenancy Isolation:**
- Free/Standard: Shared database, logical isolation via `tenantUuid` column on User table
- Enterprise: Dedicated Cloud SQL instance and Kubernetes namespace

---

### Itinerary Service (Port 8081)

**Purpose:** CRUD operations for itineraries and locations, image upload management.

**Runtime Configuration:**
- NestJS with Prisma ORM connecting to a separate PostgreSQL database
- Google Cloud Storage client for signed URL generation and image management
- Cloud SQL Proxy sidecar for database connectivity

**Scaling:**
- Same tier-based scaling as User Service (1 / 1-5 / 2-20 replicas)

**Security:**
- JWT verification for authenticated endpoints
- Signed URLs for GCS uploads (time-limited, scoped to bucket)
- Database credentials via Kubernetes Secrets

**External Connections:** Cloud SQL (PostgreSQL), Google Cloud Storage

**Multi-Tenancy Isolation:**
- Free/Standard: Shared database, queries filtered by user ownership and tenantUid
- Enterprise: Dedicated Cloud SQL instance and dedicated GCS bucket

---

### Social Service (Port 8082)

**Purpose:** Likes, comments, and email newsletter functionality.

**Runtime Configuration:**
- NestJS with Mongoose ODM connecting to MongoDB
- Newsletter module with SMTP transport (SendGrid or Gmail)
- Handlebars templates for newsletter HTML rendering
- Trending itinerary cache with 24-hour TTL

**Scaling:**
- Same tier-based scaling as other services
- Newsletter batching (50 users per batch, 5 concurrent sends) prevents overload

**Security:**
- JWT verification for social endpoints
- SMTP credentials via Kubernetes Secrets
- Newsletter unsubscribe tokens for GDPR compliance

**External Connections:** MongoDB, SMTP/SendGrid, User Service and Itinerary Service (for newsletter content enrichment)

**Multi-Tenancy Isolation:**
- Free/Standard: Shared MongoDB, documents tagged with tenant context
- Enterprise: Dedicated MongoDB database

---

### Travel Info Service (Port 8083)

**Purpose:** External travel data aggregation -- weather information, flight schedules, and travel warnings.

**Runtime Configuration:**
- NestJS with `@nestjs/axios` for external HTTP API calls
- Deployed in the `default` namespace as a shared service across all tiers

**Scaling:**
- Shared across all tiers, scales independently in the default namespace

**Security:**
- API keys for external services stored in Kubernetes Secrets
- No direct database -- stateless request proxy

**External Connections:** Weather APIs, flight data providers

**Multi-Tenancy Isolation:**
- Shared service -- no tenant-specific data stored. Serves all tiers equally.

---

### Tenant Service (Port 8084)

**Purpose:** Tenant registration, plan management, and subdomain resolution.

**Runtime Configuration:**
- NestJS with Prisma ORM connecting to a dedicated PostgreSQL database for tenant metadata
- Deployed in the `default` namespace

**External Connections:** Cloud SQL (PostgreSQL)

**Multi-Tenancy Isolation:**
- Central service -- manages tenant metadata. Not tenant-scoped itself.

---

### Provisioning Service

**Purpose:** Automated infrastructure provisioning for new tenants.

**Runtime Configuration:**
- NestJS microservice in the `default` namespace
- Executes Terraform commands for infrastructure creation
- Manages Kubernetes deployments via `kubectl` and Helm
- RBAC ClusterRole with permissions to create namespaces, secrets, deployments, services, HPAs, and gateway resources

**External Connections:** Terraform (GCS state backend), Kubernetes API, Google Secret Manager

**Deployment Updater (CronJob):**
The Provisioning Service includes a deployment synchronization module that keeps all microservices across all namespaces up to date. A Kubernetes CronJob (`deployment-sync-cronjob`) triggers the sync endpoint periodically (every 10 minutes in dev, daily at 3:01 AM UTC in production). The sync process:

1. Queries Google Artifact Registry for the latest semantic version tag of each service image
2. Lists all Kubernetes deployments running `cloudappdev-*` images across provisioned namespaces
3. Compares running image tags against the latest available versions
4. Performs `helm upgrade` on outdated deployments with the correct per-environment values

The CronJob uses a lightweight `curl` container that POSTs to `http://provisioning-service:8090/deployment-update/sync`. Concurrent executions are forbidden (`concurrencyPolicy: Forbid`), and a startup sync also runs automatically when the Provisioning Service boots. Status and results are queryable via `GET /deployment-update/sync-status` and `GET /deployment-update/status`.

---

## 2.3 Datastores

### Overview

The application uses a **polyglot persistence** strategy with three storage types:

![Datastore Overview](../diagrams/datastore-overview.drawio.svg)

1. **PostgreSQL** (relational) — User Service, Itinerary Service, Tenant Service
2. **MongoDB** (document) — Social Service (likes, comments, newsletter data)
3. **Google Cloud Storage** (object) — Image storage for locations and user avatars

### Data Model

![Data Model Relations](../diagrams/data-model-relations.drawio.svg)

#### PostgreSQL Databases

**User Service Database** ([schema](../../services/user-service/prisma/schema.prisma))

```prisma
model User {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  password   String?
  googleUid  String?  @unique
  avatarUrl  String?  
  tenantUuid String?  @db.Uuid  // Multi-tenancy isolation
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@index([email])
  @@index([googleUid])
  @@index([tenantUuid])  // Key for logical isolation
}
```

**Itinerary Service Database** ([schema](../../services/itinerary-service/prisma/schema.prisma))

```prisma
model Itinerary {
  id          Int        @id @default(autoincrement())
  user_id     Int        // Cross-service reference to User.id
  title       String
  destination String
  start_date  String
  locations   Location[]
  
  @@index([user_id])
  @@index([destination])
}

model Location {
  id           Int       @id @default(autoincrement())
  itinerary_id Int
  name         String
  images       String[]  // GCS URLs
  latitude     Float?
  longitude    Float?
  itinerary    Itinerary @relation(fields: [itinerary_id], references: [id], onDelete: Cascade)
  
  @@index([itinerary_id])
}
```

**Tenant Service Database** ([schema](../../services/tenant-service/prisma/schema.prisma))

```prisma
model Tenant {
  uuid               String   @id @default(uuid()) @db.Uuid
  name               String
  email              String   @unique
  namespace          String   @unique  // Maps to K8s namespace
  tier               String   @default("free")  // free, standard, enterprise
  domain             String?
  provisioningStatus String   @default("pending")
  
  @@index([namespace])
  @@index([tier])
}
```

#### MongoDB Collections

**Social Service Database** (MongoDB 8.0)

All collections in `social-service` database:

**Comments** ([schema](../../services/social-service/src/schemas/comment.schema.ts))

```typescript
{
  _id: ObjectId,
  userId: number,        // Cross-DB reference to User.id
  itineraryId: number,   // Cross-DB reference to Itinerary.id
  text: string,
  createdAt: Date,
  updatedAt: Date
}
// Index: { itineraryId: 1, createdAt: -1 }
```

**Likes** ([schema](../../services/social-service/src/schemas/like.schema.ts))

```typescript
{
  _id: ObjectId,
  userId: number,        // Cross-DB reference to User.id
  itineraryId: number,   // Cross-DB reference to Itinerary.id
  createdAt: Date
}
// Unique compound index: { userId: 1, itineraryId: 1 }
```

**NewsletterSubscriptions** ([schema](../../services/social-service/src/schemas/newsletter-subscription.schema.ts))

```typescript
{
  _id: ObjectId,
  userId: number,        // Cross-DB reference to User.id (unique)
  isSubscribed: boolean,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  includeTrending: boolean,
  includeRecommendations: boolean,
  recommendationCount: number,
  createdAt: Date,
  updatedAt: Date
}
// Index: { isSubscribed: 1, frequency: 1 }
```

**NewsletterDeliveries** ([schema](../../services/social-service/src/schemas/newsletter-delivery.schema.ts))

```typescript
{
  _id: ObjectId,
  userId: number,
  newsletterDate: Date,
  status: 'pending' | 'sent' | 'failed',
  retryCount: number,
  sentAt: Date,
  error: string
}
```

**TrendingItineraries** (cache collection, 24h TTL)

```typescript
{
  _id: ObjectId,
  itineraryId: number,
  score: number,          // Weighted: likes × 0.5 + comments × 0.3 + recency × 0.2
  likeCount: number,
  commentCount: number,
  lastUpdated: Date
}
```

### Multi-Tenancy Data Isolation

| Tier | PostgreSQL | MongoDB | Cloud Storage |
|------|-----------|---------|---------------|
| **Free** | Shared DB, filtered by `tenantUuid` | Shared collections, no tenant field (filtered via user ownership) | Shared bucket, prefix isolation |
| **Standard** | Shared DB, filtered by `tenantUuid` | Shared collections, no tenant field (filtered via user ownership) | Shared bucket, prefix isolation |
| **Enterprise** | Dedicated Cloud SQL instance per tenant | Dedicated database per tenant | Dedicated GCS bucket per tenant |

**Logical Isolation (Free/Standard):**

- PostgreSQL queries include `WHERE tenantUuid = ?` clause automatically via query middleware
- MongoDB relies on **user ownership chain**: User → Itinerary → Comments/Likes
  - No direct `tenantId` field in MongoDB collections
  - Isolation enforced by checking `userId` belongs to authenticated tenant's users
  - Itinerary ownership verified before allowing comments/likes

**Physical Isolation (Enterprise):**

- Separate database instances prevent any cross-tenant data leakage
- Kubernetes namespace isolation with NetworkPolicies
- Dedicated service accounts per tenant with scoped IAM permissions

### Cross-Database References

**Important:** References between PostgreSQL and MongoDB are **application-level only**, not database-enforced foreign keys.

- `Comment.userId` and `Like.userId` reference `User.id` (PostgreSQL)
- `Comment.itineraryId` and `Like.itineraryId` reference `Itinerary.id` (PostgreSQL)
- Services validate existence via inter-service HTTP calls when creating social interactions

**Referential Integrity:**

- PostgreSQL: Enforced via Prisma FK constraints (`onDelete: Cascade` for Location → Itinerary)
- MongoDB: Application-level checks only


## 2.4 Security: Roles and Role Mapping

### Service Accounts (GCP IAM)

Service accounts follow the principle of least privilege and are provisioned **per namespace and per microservice** via Terraform. The `deployment` module creates three dedicated GCP service accounts for each namespace (free, standard, or enterprise tenant), each with only the IAM roles required by that service:

| Service Account Pattern | Created Per | IAM Roles |
|------------------------|-------------|-----------|
| **user-{namespace}-sa** | Namespace | Cloud SQL Client, Cloud SQL Instance User, Storage Object Admin |
| **itinerary-{namespace}-sa** | Namespace | Cloud SQL Client, Cloud SQL Instance User, Storage Object Admin |
| **social-{namespace}-sa** | Namespace | Datastore User, Datastore Index Admin |

For example, the `free` namespace has `user-free-sa`, `itinerary-free-sa`, and `social-free-sa`. An enterprise tenant `acme-corp` would get `user-acme-corp-sa`, `itinerary-acme-corp-sa`, and `social-acme-corp-sa`.

**Naming Convention:** The pattern `{service}-{namespace}-sa` is intentionally human-readable, making it immediately clear which service and tenant a service account belongs to (e.g., `itinerary-acme-corp-sa` is the Itinerary Service in the `acme-corp` namespace). This convention also enables the Terraform modules to construct and bind service account names deterministically -- the deployment module can generate all required GCP service accounts, Kubernetes service accounts, and Workload Identity bindings using only the namespace name as input, without needing to parse or decompose existing names. The same pattern is used consistently across GCP IAM, Kubernetes, and Workload Identity, so cross-referencing between layers is straightforward.

**Shared infrastructure service accounts** (in the `default` namespace):

| Service Account | Scope | IAM Roles |
|----------------|-------|-----------|
| **tenant-default-sa** | Tenant Service | Cloud SQL Client, Cloud SQL Instance User |
| **provisioning-default-sa** | Provisioning Service | Editor, Compute Admin, Storage Admin, Cloud SQL Admin, IAM Service Account Admin/Key Admin, Datastore Owner, Project IAM Admin, Secret Manager Accessor |

**Workload Identity:** All service accounts use GKE Workload Identity instead of key files. Each GCP service account is bound to a corresponding Kubernetes service account in its namespace (e.g., `free/user-free-sa` → `user-free-sa@project.iam.gserviceaccount.com`), so pods authenticate transparently without managing credentials.

### Kubernetes RBAC

| Role | Bound To | Permissions |
|------|----------|-------------|
| **provisioning-service ClusterRole** | provisioning-service-sa (default namespace) | Create/manage namespaces, secrets, service accounts, configmaps, deployments, replicasets, statefulsets, services, pods, HPAs, ingresses, gateway resources, PVCs |

### Multi-Tenancy Security Isolation

| Aspect | Free | Standard | Enterprise |
|--------|------|----------|------------|
| **Namespace** | Shared (`free`) | Shared (`standard`) | Dedicated (`{tenant-name}`) |
| **Service Accounts** | Shared per-service SAs (`*-free-sa`) | Shared per-service SAs (`*-standard-sa`) | Dedicated per-service SAs (`*-{tenant}-sa`) |
| **Database** | Shared, logical isolation (`tenantUuid`) | Shared, logical isolation (`tenantUuid`) | Dedicated Cloud SQL instances |
| **Storage** | Shared bucket, prefix isolation | Shared bucket, prefix isolation | Dedicated GCS bucket |
| **Secrets** | Namespace-scoped K8s secrets | Namespace-scoped K8s secrets | Tenant-scoped K8s secrets in dedicated namespace |
| **Network** | Shared pod network | Shared pod network | Namespace-level isolation (NetworkPolicies) |
| **Compute** | Shared pods (1 replica) | Shared pods (1-5 replicas) | Dedicated pods (2-20 replicas) |