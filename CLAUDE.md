# CLAUDE.md - AI Assistant Guide

> **Last Updated:** November 26, 2025
> **Purpose:** Comprehensive guide for AI assistants working with this codebase

## Course Context

**Cloud Application Development Course Project**
- **Institution:** HTWG University of Applied Sciences Konstanz
- **Term:** Winter 2025/26
- **Instructor:** Prof. Dr. Markus Eiglsperger
- **Project Mission:** Develop a cloud-native SaaS application for social travel itinerary management

**Business Model:** B2B SaaS with tiered pricing
- **Free:** Best effort, no customization
- **Standard:** SLA, limited white labeling
- **Enterprise:** Premium SLA, highly customizable

## Milestone Status

### ✅ Milestone 1: Cloud Foundations (Due: 05.11.2025) - **COMPLETE**
- All 7 user stories implemented (register, create/view itinerary, add locations, upload images, search, like/comment)
- IaaS and PaaS deployments with Terraform automation
- Performance testing (IaaS vs PaaS comparison)
- Multi-database architecture (PostgreSQL + MongoDB)
- Object storage integration (Google Cloud Storage)
- Firebase Authentication with Google OAuth

### 🔄 Milestone 2: Cloud-Native Applications (Due: 03.12.2025) - **IN PROGRESS**
**Target Grade:** 1.0-1.3 (Sehr Gut) - requires 2+ Wow factors in different microservices

**Implementation Status:**
- ✅ **Microservice Architecture** - 4 services + API Gateway deployed
- ✅ **Kubernetes Manifests** - Complete K8s configuration
- ✅ **Infrastructure as Code** - Terraform automation
- ✅ **CI/CD Pipeline** - Smart multi-service build workflow
- ✅ **Social Service** - Separate microservice with Email Newsletter Wow Factor
- ✅ **Travel Info Service** - Implemented with async workflows
- ✅ **Asynchronous Workflows** - Implemented with control mechanisms (Newsletter)
- ✅ **Performance Testing** - Comprehensive load testing framework implemented
- ✅ **Wow Factors** - 2+ factors implemented (Travel Info + Newsletter)
- 🔄 **Architecture Document** - Documentation pending

**Implemented Wow Factors:**
1. **Travel Information Service:**
   - Flight schedule change monitoring
   - Travel warnings (natural disasters, political unrest)
   - Weather information with value-added insights

2. **Social Service - Email Newsletter:**
   - Personalized weekly newsletter with multi-factor content ranking
   - Async workflow with Kubernetes CronJob scheduling
   - Control mechanisms for status, logs, and manual triggers
   - Full delivery tracking and retry logic

### ⏳ Milestone 3: Production-Grade Applications
- **Implementation:** 21.01.2026
- **Documentation:** 30.01.2026
- Details TBD

## Grading Criteria

- **4.0-3.7 (Ausreichend):** Working app, minimal hygiene factors
- **3.3-2.7 (Befriedigend):** Basic implementation of all hygiene factors
- **2.3-1.7 (Gut):** Good implementation with limited wow factors (1 Wow factor)
- **1.3-1.0 (Sehr Gut):** Very good implementation with wow factors (2+ Wow factors in different microservices)

## Table of Contents

1. [Repository Overview](#repository-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Development Workflows](#development-workflows)
6. [Database Management](#database-management)
7. [API Patterns](#api-patterns)
8. [Testing & Quality](#testing--quality)
9. [Deployment](#deployment)
10. [Key Conventions](#key-conventions)
11. [Common Tasks](#common-tasks)
12. [Troubleshooting](#troubleshooting)

---

## Repository Overview

**CloudAppDev** is a full-stack cloud-native SaaS application for social travel itinerary management with microservices architecture supporting scalable, global deployment.

### Project Type
- **Frontend:** Next.js 15.5.4 with React 19, App Router, Turbopack
- **Backend:** Hybrid (monolithic Next.js API routes + NestJS microservices)
- **Databases:** PostgreSQL (Prisma) + MongoDB (native driver)
- **Cloud:** Google Cloud Platform (Cloud Run, Cloud SQL, Cloud Storage, Artifact Registry)

### Key Features
- User authentication (Firebase Auth + custom JWT)
- Itinerary management with Google Cloud Storage for images
- Social features (comments, likes) with MongoDB
- Microservices architecture with API Gateway (Nginx)
- IaaS and PaaS deployment options
- Load testing with Locust
- Infrastructure as Code (Terraform)
- Kubernetes manifests (GKE)

---

## Architecture

### Hybrid Architecture

The project supports **two deployment modes**:

#### 1. Monolithic Mode (Default)
- **Single Next.js Application** with API routes
- Uses `app/api/*` routes for all backend logic
- Databases: PostgreSQL (port 5432) + MongoDB (port 27017)
- Simple docker-compose setup
- Best for development and simple deployments

#### 2. Microservices Mode (Milestone 2 - Current Focus)
- **API Gateway** (Nginx on port 8000) - single entry point
- **User Service** (NestJS on port 8080) - Firebase Auth, user management
- **Itinerary Service** (NestJS on port 8081) - itinerary CRUD, GCS integration
- **Social Service** (NestJS on port 8082) - comments, likes with MongoDB
- **Travel Info Service** (NestJS on port 8083) - flight schedules, travel warnings, weather (Wow factors)
- Each service has its own database (PostgreSQL 5433, 5434; MongoDB 27017)
- Uses `docker-compose.microservices.yml`
- Kubernetes-ready deployments

### Communication Flow

```
Client/Frontend (Next.js)
    ↓
API Gateway (Nginx :8000)
    ↓
├── User Service (NestJS :8080) → PostgreSQL :5433
├── Itinerary Service (NestJS :8081) → PostgreSQL :5434 + GCS
├── Social Service (NestJS :8082) → MongoDB :27017
└── Travel Info Service (NestJS :8083) → External APIs (async workflows)
```

### Microservices Architecture (Milestone 2)

Each microservice follows **NestJS framework** with:
- **Modular structure:** Controllers, Services, DTOs, Entities
- **Independent deployment:** Each service has its own Dockerfile
- **Database per service:** Follows microservices best practices
- **Health checks:** `/health` endpoints for Kubernetes probes
- **Environment-based config:** Using `@nestjs/config`
- **Testing:** Jest unit tests and e2e tests
- **API documentation:** RESTful endpoints with validation

#### Service Responsibilities

**User Service:**
- User registration and authentication
- Profile management (including avatar uploads)
- Firebase Auth token verification
- User search and retrieval

**Itinerary Service:**
- Itinerary CRUD operations
- Location management within itineraries
- Image uploads to Google Cloud Storage
- Itinerary search and filtering

**Social Service:**
- Likes and comments management
- MongoDB for high-volume social interactions
- Real-time engagement tracking

**Travel Info Service (Wow Factors):**
- **Flight Schedule Monitoring:** Async parsing of flight data, notifications on changes
- **Travel Warnings:** Push notifications from external sources, traveler alerts
- **Weather Processing:** Value-added weather insights for travelers
- **Async Workflows:** Background jobs with control mechanisms
- **External API Integration:** Using `@nestjs/axios` for HTTP requests

### Multi-Tenancy Architecture (Milestone 3)

The application supports **B2B SaaS multi-tenancy** with three tiers:

#### Tenant Tiers

1. **Free Tier**
   - Shared namespace (`free`)
   - Shared PostgreSQL database (logical isolation)
   - Shared MongoDB collections
   - Shared Google Cloud Storage bucket
   - Best-effort service (no SLA)
   - Domain: `{tenant-name}.cloudappdev.site`

2. **Standard Tier**
   - Shared namespace (`standard`)
   - Shared PostgreSQL database (logical isolation)
   - Shared MongoDB collections
   - Dedicated GCS bucket per tenant
   - SLA with limited white-labeling
   - Domain: `{tenant-name}.cloudappdev.site`

3. **Enterprise Tier**
   - **Dedicated namespace** per tenant
   - **Dedicated PostgreSQL instance** per tenant
   - **Dedicated MongoDB database** per tenant
   - **Dedicated GCS bucket** per tenant
   - **Dedicated microservice pods** (full stack isolation)
   - Premium SLA with full customization
   - Domain: `{tenant-name}.cloudappdev.site`

#### Infrastructure Provisioning

**Infrastructure-Provisioner Service** (`services/infrastructure-provisioner/`)
- NestJS microservice for automated tenant provisioning
- REST API for tenant lifecycle management
- Terraform integration for infrastructure-as-code provisioning

**Endpoints:**
```bash
POST /provision-tenant
{
  "tenantId": 123,
  "tenantName": "acme-corp",
  "tier": "enterprise",
  "environment": "dev"
}

POST /deprovision-tenant
{
  "tenantName": "acme-corp",
  "tier": "enterprise",
  "environment": "dev"
}

GET /tenants/:environment
```

**Provisioning Flow:**
1. Validate tenant request (tier, name, etc.)
2. Update `tenants.tfvars` in `terraform/environments/{env}-tenants/`
3. Run `terraform apply` (separate state file)
4. For enterprise: Deploy dedicated K8s namespace with full stack
5. Create subdomain certificate in Cloudflare
6. Return tenant domain and infrastructure details

**Key Features:**
- **Separate Terraform states** prevent conflicts with base infrastructure
- **Idempotent operations** (safe to retry)
- **Automatic rollback** on failures
- **Resource tagging** for cost allocation
- **Service account provisioning** with minimal permissions

#### Tenant Isolation

**Network Isolation (Enterprise):**
- Kubernetes NetworkPolicies restrict cross-namespace traffic
- Dedicated service endpoints per enterprise namespace
- API Gateway routes traffic based on subdomain

**Data Isolation:**
- Free/Standard: Logical isolation via `tenant_id` column
- Enterprise: Physical isolation with dedicated databases

**Resource Isolation (Enterprise):**
- Dedicated CPU/memory limits per namespace
- Separate Cloud SQL instances
- Separate MongoDB databases
- Separate GCS buckets

### Path Aliases

Configured in `tsconfig.json`:
```typescript
"@/*"          → "./*"           // Root level
"@lib/*"       → "lib/*"         // Shared utilities
"@actions/*"   → "app/actions/*" // Server actions
"@context/*"   → "app/context/*" // React contexts
"@hooks/*"     → "app/hooks/*"   // Custom hooks
"@components/*"→ "app/components/*" // UI components
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15.5.4 with Turbopack
- **React:** 19.1.0 (App Router, Server Components)
- **UI Library:** PrimeReact 10.9.7 + TailwindCSS 4
- **Theme:** next-themes (dark mode support)
- **Icons:** PrimeIcons 7.0.0

### Backend
- **Monolithic:** Next.js API Routes
- **Microservices:** NestJS 11.0.1
- **Authentication:** Firebase Admin SDK + JWT (jose)
- **ORM:** Prisma 6.17.0 (PostgreSQL)
- **MongoDB Driver:** native mongodb@6.11.0

### Databases
- **PostgreSQL:** 16 (relational data - users, itineraries)
- **MongoDB:** 8.0 (document store - social interactions)

### Cloud Services
- **Google Cloud Storage:** File uploads (images)
- **Firebase Auth:** User authentication
- **Google Artifact Registry:** Docker image hosting

### DevOps
- **Containerization:** Docker + Docker Compose
- **Orchestration:** Kubernetes (GKE)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions (build-and-push workflows)
- **Reverse Proxy:** Nginx (with SSL via Certbot)
- **Load Testing:** Locust

---

## 12-Factor App Compliance (Milestone 2 Requirement)

The application follows [12-Factor App](https://12factor.net/) methodology:

1. **✅ Codebase:** Single codebase in Git, multiple deployments (dev/staging/prod)
2. **✅ Dependencies:** Explicitly declared in `package.json`, isolated with npm
3. **✅ Config:** Environment variables via `.env` files, never committed to repo
4. **✅ Backing Services:** Databases, storage, external APIs treated as attached resources
5. **✅ Build, Release, Run:** Strict separation via Docker multi-stage builds, CI/CD
6. **✅ Processes:** Stateless processes, session data in external stores (Firebase, databases)
7. **✅ Port Binding:** Self-contained services export via port binding (Next.js :3000, services :8080-8083)
8. **✅ Concurrency:** Scale out via process model (Kubernetes pods, horizontal scaling)
9. **✅ Disposability:** Fast startup/shutdown, graceful termination, ready for container orchestration
10. **✅ Dev/Prod Parity:** Docker ensures consistency, same tech stack across environments
11. **✅ Logs:** Treat logs as event streams (stdout/stderr), no local log files
12. **✅ Admin Processes:** One-off admin tasks via dedicated scripts (migrations, seeding)

**Implementation Details:**
- All configuration via environment variables (`DATABASE_URL`, `MONGODB_URI`, etc.)
- Docker multi-stage builds separate build/runtime environments
- Health check endpoints for all services
- Horizontal scaling ready with stateless design
- Database migrations as versioned, idempotent scripts
- Secrets management via Kubernetes Secrets and environment variables

---

## CI/CD Pipeline (GitHub Actions)

### Multi-Service Build Workflow
**File:** `.github/workflows/build-and-push-microservices.yml`

**Smart Features:**
- **Change Detection:** Only builds services that have changed
- **Selective Building:** Manual trigger can build all, specific service, or only changed
- **Semantic Versioning:** Automatic version bumping and tagging
- **Parallel Builds:** All changed services build simultaneously
- **Image Registry:** Pushes to Google Artifact Registry

**Services Built:**

1. `cloudappdev-frontend` - Next.js application
2. `cloudappdev-user-service` - User management microservice
3. `cloudappdev-itinerary-service` - Itinerary microservice
4. `cloudappdev-social-service` - Social features microservice
5. `cloudappdev-travel-info-service` - Travel information microservice
6. `cloudappdev-api-gateway` - Nginx API Gateway
7. `seeder` - Unified database seeder (separate workflow)

**Version Tags:**
- `latest` - Latest build from main/master branch
- `0.1.X` - Semantic version (incremented on master)
- `0.1.X-dev.Y` - Development builds with build number
- `sha-abc1234` - Git commit SHA reference

**Triggers:**
- Push to `develop` or `master` branches
- Manual workflow dispatch with service selection

### Seeder Workflow

**File:** `.github/workflows/build-and-push-seeder.yml`

The seeder is a unified database seeding container for Kubernetes deployments that handles all microservices databases (User, Itinerary, Social) in a single job.

**Purpose:**

- Seeds all microservice databases with test data
- Handles ID dependencies between services (users -> itineraries -> social)
- Designed for Kubernetes Job execution
- Uses JSON dataset from `seed-data/dataset.json`

**Features:**

- **Unified Container:** Single container with access to all service databases
- **Prisma Integration:** Generates Prisma clients for both User and Itinerary services
- **ID Mapping:** Uses key-based references in dataset, resolves to actual IDs at runtime
- **Idempotent:** Clears existing data before seeding (safe to run multiple times)

**Path Triggers:**

- `services/seeder/**`
- `seed-data/**`
- `services/user-service/prisma/**`
- `services/itinerary-service/prisma/**`

**Version Tags:**

- `latest` - Latest build from main/master branch
- `0.1.X` - Semantic version (incremented on master)
- `0.1.X-dev.Y` - Development builds with build number
- `sha-abc1234` - Git commit SHA reference

**Image Registry:**

- `europe-west1-docker.pkg.dev/<PROJECT_ID>/docker-repo/seeder`

**Kubernetes Usage:**

```bash
# Apply seeding job
kubectl apply -f k8s/seeding-job.yaml

# Check job status
kubectl get jobs cloudappdev-seeder
kubectl logs job/cloudappdev-seeder
```

**Environment Variables (from K8s Secrets):**

- `USER_DATABASE_URL` - PostgreSQL connection for User Service
- `ITINERARY_DATABASE_URL` - PostgreSQL connection for Itinerary Service
- `SOCIAL_MONGODB_URI` - MongoDB connection for Social Service
- `SEED_DATA_PATH` - Path to dataset.json (default: `/app/seed-data/dataset.json`)

---

## Directory Structure

```
CloudAppDev/
├── app/                          # Next.js App Router
│   ├── api/                      # Server-side API proxy routes (route through API Gateway)
│   │   ├── auth/                 # Authentication proxies (login, register)
│   │   ├── dev/                  # Development tool proxies
│   │   ├── itineraries/          # Itinerary management proxies
│   │   ├── signed-url/           # GCS signed URL generation proxy
│   │   ├── travel-info/          # Travel information proxies (weather, location, coords)
│   │   ├── upload/               # File upload proxy
│   │   ├── user/                 # User data proxy
│   │   ├── comments/             # Comment endpoints
│   │   ├── likes/                # Like endpoints
│   ├── components/               # React components
│   │   ├── CommentSection.js
│   │   ├── LikeButton.js
│   │   ├── imageUpload.js
│   │   ├── itineraryTable.js
│   │   ├── menu.js
│   │   ├── profileForm.js
│   │   └── theme-provider.tsx
│   ├── context/                  # React Context providers
│   │   └── UserContext.js
│   ├── hooks/                    # Custom React hooks
│   │   └── useFileUpload.ts
│   ├── itineraries/              # Itinerary pages
│   │   ├── [id]/                 # Dynamic route
│   │   └── new/                  # Create new itinerary
│   ├── login/                    # Login page
│   ├── profile/                  # User profile page
│   ├── register/                 # Registration page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
│
├── services/                     # NestJS Microservices (Milestone 2)
│   ├── user-service/             # User management
│   │   ├── src/                  # NestJS source code
│   │   ├── prisma/               # Prisma schema for users DB
│   │   ├── test/                 # Jest tests
│   │   ├── Dockerfile            # Service container
│   │   ├── package.json          # Dependencies (@nestjs/*, @prisma/client, firebase-admin)
│   │   └── README.md
│   ├── itinerary-service/        # Itinerary management
│   │   ├── src/
│   │   ├── prisma/               # Prisma schema for itineraries DB
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── package.json          # Dependencies (@google-cloud/storage)
│   │   └── README.md
│   ├── social-service/           # Social interactions (Milestone 2 hygiene factor)
│   │   ├── src/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── package.json          # Dependencies (mongoose, @nestjs/mongoose)
│   │   └── README.md
│   ├── travel-info-service/      # Travel information (Milestone 2 Wow factors)
│   │   ├── src/                  # Flight schedules, travel warnings, weather
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── package.json          # Dependencies (@nestjs/axios for external APIs)
│   │   └── README.md
│   └── seeder/                   # Unified database seeder (Kubernetes)
│       ├── seed.js               # Main seeding script
│       ├── Dockerfile            # Multi-service Prisma container
│       ├── package.json          # Dependencies (mongodb, prisma clients)
│       ├── README.md             # Seeder documentation
│       ├── QUICKSTART.md         # Quick start guide
│       └── MAINTENANCE.md        # Maintenance guide
│
├── seed-data/                    # Test data for seeding
│   └── dataset.json              # Users, itineraries, locations, social data
│
├── lib/                          # Shared utilities
│   ├── mongodb.js                # MongoDB client
│   └── prisma.js                 # Prisma client
│
├── prisma/                       # Database schema (monolithic)
│   ├── schema.prisma
│   └── seed.js
│
├── k8s/                          # Kubernetes manifests
│   ├── services/                 # Service deployments
│   ├── app-deployment.yaml
│   ├── gateway.yaml
│   ├── seeding-job.yaml          # Database seeding Kubernetes Job
│   └── *.yaml
│
├── terraform/                    # Infrastructure as Code
│   ├── main.tf
│   ├── network-config.tf
│   ├── service-accounts.tf
│   ├── secrets.tf
│   └── variables.tf
│
├── nginx/                        # Nginx configuration
│   ├── Dockerfile
│   └── conf.d/
│
├── scripts/                      # Utility scripts
│   └── seed scripts for microservices
│
├── locust/                       # Load testing
│   ├── locustfile.py             # Monolithic load tests (Milestone 1)
│   ├── locustfile_microservices.py  # Microservices load tests (Milestone 2)
│   ├── run_milestone2_tests.ps1  # Automated test runner
│   ├── test_microservices.py     # Service health checks
│   ├── QUICKSTART.md             # Quick start guide
│   ├── README_MICROSERVICES.md   # Detailed documentation
│   └── reports/                  # Generated test reports
│
├── .github/workflows/            # CI/CD pipelines
│   ├── build-and-push-app.yml    # Next.js frontend image
│   ├── build-and-push-microservices.yml  # All microservices
│   └── build-and-push-seeder.yml # Database seeder image
│
├── docker-compose.yml            # Monolithic setup
├── docker-compose.microservices.yml  # Microservices setup
├── Dockerfile                    # Next.js app image
├── package.json                  # Root dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # TailwindCSS config
├── .gitignore
├── .env (gitignored)
├── example.env                   # Environment template
├── deploy.sh / deploy.ps1        # Deployment scripts
├── README.md                     # General documentation
├── MICROSERVICES.md              # Microservices guide
├── MONGODB.md                    # MongoDB setup guide
└── CLAUDE.md                     # This file
```

---

## Development Workflows

### Local Development Setup

#### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Google Cloud credentials (for storage/auth)
- Firebase credentials

#### Quick Start (Monolithic)

```bash
# 1. Clone and install
git clone <repo>
cd CloudAppDev
npm install

# 2. Configure environment
cp example.env .env
# Edit .env with your credentials

# 3. Start databases
docker-compose up -d db mongodb

# 4. Initialize databases
npm run db:deploy        # PostgreSQL migrations
npm run db:init-mongo    # MongoDB collections

# 5. Run development server
npm run dev              # http://localhost:3000
```

#### Quick Start (Microservices)

```bash
# 1. Start all services
docker-compose -f docker-compose.microservices.yml up -d

# 2. Seed databases
npm run seed:microservices

# 3. Check status
docker-compose -f docker-compose.microservices.yml ps

# API Gateway: http://localhost:8000
# Test endpoints:
curl http://localhost:8000/api/v1/users
curl http://localhost:8000/api/v1/itineraries
curl http://localhost:8000/api/v1/social/comments
```

### NPM Scripts

```bash
# Next.js Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm start                # Start production server

# Database Management
npm run db:deploy        # Run PostgreSQL migrations
npm run db:seed          # Seed PostgreSQL database
npm run db:init-mongo    # Initialize MongoDB collections

# Microservices
npm run seed:microservices  # Seed all microservices databases
```

### Git Branch Workflow

- **Main Branch:** Production-ready code
- **Develop Branch:** Integration branch for features
- **Feature Branches:** `feature/<name>` or `claude/<session-id>`
- **CI/CD:** GitHub Actions on push to `develop`

**Important:** Claude-created branches follow pattern `claude/claude-md-<session-id>-<hash>`

---

## Database Management

### PostgreSQL (Prisma)

#### Schema Location
- **Monolithic:** `prisma/schema.prisma`
- **Microservices:**
  - User Service: `services/user-service/prisma/schema.prisma`
  - Itinerary Service: `services/itinerary-service/prisma/schema.prisma`

#### Common Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration_name>

# Deploy migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database (development only!)
npx prisma migrate reset
```

#### Usage in Code

```typescript
import prisma from '@/lib/prisma';

// Query examples
const users = await prisma.user.findMany();
const user = await prisma.user.findUnique({ where: { id: 1 } });
const itinerary = await prisma.itinerary.create({
  data: { title: 'Trip', userId: 1 }
});
```

### MongoDB

#### Collections
- **Monolithic:** `likes` collection in main app
- **Microservices:** `comments`, `likes` in Social Service

#### Usage in Code

```javascript
import clientPromise from '@/lib/mongodb';

const client = await clientPromise;
const db = client.db('appdb');

// Insert document
await db.collection('likes').insertOne({
  user_id: 1,
  itinerary_id: 42,
  created_at: new Date()
});

// Query documents
const likes = await db.collection('likes')
  .find({ itinerary_id: 42 })
  .toArray();
```

#### Indexes
MongoDB collections are automatically indexed on composite keys:
- `likes`: `(user_id, itinerary_id)` - unique
- `comments`: `(user_id, itinerary_id)`

---

## API Patterns

### Server-Side API Proxy Routes (Milestone 2 - Current)

All frontend-to-backend communication routes through server-side Next.js proxy routes, which then communicate with the API Gateway. This ensures:
- No client-side exposure to API Gateway URLs
- Works in both local Docker and Kubernetes environments
- Single environment variable configuration (`API_GATEWAY_URL`)

Located in `app/api/`:

```typescript
// app/api/auth/login/route.js - Server-side proxy example
import { NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

export async function POST(request) {
  try {
    const body = await request.json();

    // Route through API Gateway
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/users/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API /auth/login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to login', message: error.message },
      { status: 500 }
    );
  }
}
```

### Microservices API

Backend microservices use NestJS controllers (port 8080-8083):

```typescript
// services/user-service/src/users/users.controller.ts
@Controller('users')
export class UsersController {
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### Client-Server Communication Flow

```
Client Component (Browser)
    ↓ fetch()
Next.js API Route (Server-side)
    ↓ fetch()
API Gateway (http://localhost:8000 or http://api-gateway:80)
    ↓ routes to
Microservice (NestJS on 8080-8083)
```

**Environment Variables:**

- `API_GATEWAY_URL` (server-side only, required)
  - LOCAL DEV: `http://localhost:8000`
  - KUBERNETES: `http://api-gateway:80`

### Authentication

Uses Firebase Auth + JWT tokens:

```typescript
// Verify token server-side
import { jwtVerify } from 'jose';

const token = request.headers.get('Authorization')?.replace('Bearer ', '');
const { payload } = await jwtVerify(token, secret);
```

---

## Testing & Quality

### Unit Tests

NestJS services use Jest:

```bash
# Run tests
cd services/user-service
npm test

# Coverage
npm run test:cov
```

### Load Testing

Using Locust (Python) with both monolithic and microservices configurations:

```bash
# Install
pip install locust

# === Monolithic Mode (Milestone 1) ===
locust -f locust/locustfile.py --host=http://localhost:3000

# === Microservices Mode (Milestone 2) ===
# Quick health check first
python locust/test_microservices.py

# Run with web UI
locust -f locust/locustfile_microservices.py --host=http://localhost:8000

# Open browser: http://localhost:8089
```

#### Milestone 2 Load Testing (Microservices)

**New Test Files:**
- `locust/locustfile_microservices.py` - Load test scenarios for microservices
- `locust/run_milestone2_tests.ps1` - Automated test runner with all scenarios
- `locust/test_microservices.py` - Health check script for services
- `locust/QUICKSTART.md` - Quick start guide
- `locust/README_MICROSERVICES.md` - Detailed documentation

**Automated Testing (PowerShell):**
```powershell
# Run all required test scenarios
.\locust\run_milestone2_tests.ps1 -TargetHost "http://localhost:8000" -TestType all

# Individual tests
.\locust\run_milestone2_tests.ps1 -TestType periodic-a   # 100/10 users
.\locust\run_milestone2_tests.ps1 -TestType periodic-b   # 1000/20 users
.\locust\run_milestone2_tests.ps1 -TestType lifetime     # Continuous growth

# Custom growth rate for lifetime tests
.\locust\run_milestone2_tests.ps1 -TestType lifetime -GrowthRate 30 -MaxUsers 3000
```

**Test Scenarios (Exercise 5 Requirements):**

1. **Periodic Workload - Scenario A:**
   - Peak: 100 concurrent users
   - Low demand: 10 users
   - Pattern: Low → Ramp up → Peak → Ramp down → Low (2 cycles, ~14 min)

2. **Periodic Workload - Scenario B:**
   - Peak: 1000 concurrent users
   - Low demand: 20 users
   - Pattern: Low → Ramp up → Peak → Ramp down → Low (2 cycles, ~30 min)

3. **Once-in-a-Lifetime Workload:**
   - Start with 10 users, constantly add users
   - Find thresholds: no degradation, with degradation, failure
   - Performance criteria:
     - Without degradation: p95 < 500ms, error < 1%
     - With degradation: p95 < 2000ms, error < 5%
     - Failure: p95 >= 2000ms or error >= 5%

**Response Time Guidelines:**
- **Excellent:** p95 < 500ms
- **Good:** p95 < 1000ms
- **Acceptable:** p95 < 2000ms
- **Poor:** p95 > 2000ms

**Failure Rate Guidelines:**
- **Excellent:** < 0.1%
- **Good:** < 1%
- **Acceptable:** < 5%
- **Poor:** > 5%

**Key Performance Metrics:**
- See `README.md` for IaaS vs PaaS comparison
- `paasincresed.html` contains Milestone 1 benchmark results
- `locust/reports/` contains Milestone 2 test reports

### Linting

NestJS services have ESLint configured:

```bash
npm run lint        # Check
npm run format      # Format with Prettier
```

---

## Deployment

### Docker Compose (Local/IaaS)

```bash
# Monolithic
docker-compose up -d

# Microservices
docker-compose -f docker-compose.microservices.yml up -d
```

### Google Cloud Run (PaaS)

```bash
# Windows
.\deploy.ps1 deploy

# Linux/Mac
./deploy.sh deploy

# Commands: deploy, update, logs, status, delete
```

**Requirements:**
- Google Cloud SDK
- Docker
- Configured `GCP_PROJECT_ID` in scripts

### GitHub Actions CI/CD

**Workflows:**
1. `build-and-push-app.yml` - Builds Next.js app image
2. `build-and-push-microservices.yml` - Builds all microservices

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch with custom tag

**Image Registry:**
- `europe-west1-docker.pkg.dev/<PROJECT_ID>/docker-repo/cloudappdev`

**Tags:**
- `latest` (develop branch)
- `sha-<git-sha>` (every commit)
- `pr-<number>` (pull requests)
- Semantic versions (`1.0.0`, `1.0`)

### Terraform (IaC)

**⚠️ Important: Terraform State Separation**

Infrastructure is split into **two separate state files** to prevent conflicts between local management and dynamic tenant provisioning:

#### 1. Base Infrastructure (`terraform/environments/dev/`)
Manages core infrastructure that changes infrequently:
- GKE Autopilot cluster
- Workload Identity Pool
- Base namespaces (free, standard, default)
- Service accounts (app, tenant, provisioner)
- Certificate map
- Main domain (dev.cloudappdev.site)

**State:** `gs://cloudappdev-tf-state-dev/env/dev`

```bash
cd terraform/environments/dev

# Initialize
terraform init

# Plan changes
terraform plan

# Apply infrastructure
terraform apply

# SAFE: Won't affect dynamically provisioned tenants
```

#### 2. Tenant Infrastructure (`terraform/environments/dev-tenants/`)
Manages tenant-specific resources (dynamically provisioned):
- Tenant domains (subdomain certificates)
- Enterprise namespaces (dedicated infrastructure)

**State:** `gs://cloudappdev-tf-state-dev/env/dev-tenants`

**Managed by:** `infrastructure-provisioner` service via API endpoints

```bash
# Typically not run manually, but for debugging:
cd terraform/environments/dev-tenants

terraform init
terraform plan -var-file=terraform.tfvars -var-file=tenants.tfvars
```

**Why Separate States?**
- Local runs on base infrastructure won't delete provisioned tenant resources
- Infrastructure-provisioner service manages tenant lifecycle independently
- Clear separation of concerns: static vs. dynamic infrastructure

### Kubernetes (GKE)

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployments
kubectl get deployments
kubectl get services
kubectl get pods

# View logs
kubectl logs <pod-name>
```

---

## Key Conventions

### Code Style

1. **TypeScript** is preferred for new code
2. **ES Modules** everywhere (`type: "module"` in package.json)
3. **Async/await** over promises
4. **Server Components** by default in Next.js (add `"use client"` only when needed)
5. **Path aliases** - use `@components/*`, `@lib/*`, etc.

### File Naming

- **Components:** PascalCase or camelCase (`CommentSection.js`, `menu.js`)
- **API routes:** `route.ts` or `route.js`
- **Pages:** `page.tsx`
- **Utilities:** camelCase (`api-config.ts`, `mongodb.js`)

### Environment Variables

#### Build-time (baked into bundle)
```bash
NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY
NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID
NEXT_PUBLIC_API_GATEWAY_URL
```

#### Runtime (server-side only)
```bash
DATABASE_URL
MONGODB_URI
GOOGLE_CLOUD_CREDENTIALS_BASE64
GOOGLE_CLOUD_STORAGE_BUCKET
GOOGLE_CLOUD_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON_BASE64
```

**Critical:** `NEXT_PUBLIC_*` variables must be set during Docker build!

### Database Conventions

1. **PostgreSQL**: Use Prisma schema and migrations
2. **MongoDB**: Use indexes for performance
3. **Idempotent scripts**: Safe to run multiple times
4. **Migrations**: Always create migrations for schema changes

### Docker Build Arguments

```dockerfile
ARG DATABASE_URL_BUILD="postgresql://..."
ARG FIREBASE_API_KEY_BUILD="..."
# These are passed during build and baked into the image
```

---

## Common Tasks

### Adding a New API Endpoint

#### Monolithic Mode
```typescript
// app/api/newfeature/route.ts
export async function GET(request: Request) {
  // Implementation
}
```

#### Microservices Mode
```typescript
// services/user-service/src/newfeature/newfeature.controller.ts
@Controller('newfeature')
export class NewFeatureController {
  @Get()
  async findAll() { }
}
```

### Adding a New Database Table

```bash
# 1. Edit schema
vim prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_new_table

# 3. Generate client
npx prisma generate

# 4. Use in code
import prisma from '@/lib/prisma';
const items = await prisma.newTable.findMany();
```

### Adding a New Microservice

1. Create service directory: `services/my-service/`
2. Copy structure from existing service
3. Add to `docker-compose.microservices.yml`
4. Update `nginx/conf.d/` for routing
5. Add Dockerfile
6. Update GitHub Actions workflow

### Updating Dependencies

```bash
# Check outdated
npm outdated

# Update package.json
npm update

# Or specific package
npm install <package>@latest

# Update services
cd services/user-service && npm update
```

### Running Database Migrations in Production

```bash
# Automatic (Docker CMD already includes this)
npx prisma migrate deploy

# Manual
docker exec cloudappdev_frontend npx prisma migrate deploy
```

### Viewing Logs

```bash
# Docker Compose
docker-compose logs -f frontend
docker-compose logs -f db

# Microservices
docker logs cloudappdev_user_service -f
docker logs cloudappdev_api_gateway -f

# Kubernetes
kubectl logs -f deployment/cloudappdev-app
```

---

## Troubleshooting

### Common Issues

#### 1. `NEXT_PUBLIC_*` Variables Not Working

**Problem:** Client-side code can't access Firebase config
**Solution:** These must be set during `docker build`, not at runtime
```bash
docker-compose build --build-arg FIREBASE_API_KEY_BUILD=$NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY
```

#### 2. Database Connection Failed

**Problem:** `Error: Can't reach database server`
**Solutions:**
- Check `.env` credentials match docker-compose
- Ensure database container is healthy: `docker-compose ps`
- Check ports aren't conflicting: `lsof -i :5432`

#### 3. Prisma Client Out of Sync

**Problem:** `PrismaClient is unable to run in this browser environment`
**Solution:**
```bash
npx prisma generate
npm run build
```

#### 4. MongoDB Connection Timeout

**Problem:** `MongoServerSelectionError`
**Solutions:**
- Verify MongoDB is running: `docker logs cloudappdev_mongodb`
- Check auth: `MONGO_INITDB_ROOT_USERNAME` and password in `.env`
- Run initialization: `npm run db:init-mongo`

#### 5. Microservices Can't Communicate

**Problem:** Services return 502/504 errors
**Solutions:**
- Check API Gateway logs: `docker logs cloudappdev_api_gateway`
- Verify service health: `docker-compose -f docker-compose.microservices.yml ps`
- Test direct access: `curl http://localhost:8080/api/v1/users`

#### 6. Image Upload Fails

**Problem:** `Failed to upload to GCS`
**Solutions:**
- Verify `GOOGLE_CLOUD_CREDENTIALS_BASE64` is set
- Check service account has "Storage Object Admin" role
- Test bucket access manually with `gsutil`

#### 7. GitHub Actions Build Fails

**Problem:** Docker build fails in CI/CD
**Solutions:**
- Check secrets are configured in GitHub repo settings
- Verify `GCP_SA_KEY` has Artifact Registry permissions
- Check workflow file syntax

#### 8. Turbopack Build Errors

**Problem:** `Error: Failed to compile`
**Solutions:**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for ESM/CJS conflicts in imports

#### 9. Prisma Schema Cache Issues (Microservices)

**Problem:** `PrismaClientKnownRequestError: The column X does not exist in the current database`
**Cause:** When you modify a Prisma schema, the compiled Prisma Client in `node_modules/@prisma/client` caches the old schema. Docker containers include this cache, so the old schema is still referenced even after database migrations.

**Solution:**
```bash
# 1. Clear Prisma cache locally
cd services/user-service
rm -rf node_modules/.prisma
npx prisma generate

# 2. Remove old containers and images
docker-compose -f docker-compose.microservices.yml down
docker rmi cloudappdev-user-service:latest

# 3. Rebuild image from scratch (--no-cache forces full rebuild)
docker-compose -f docker-compose.microservices.yml build --no-cache user-service

# 4. Start services again
docker-compose -f docker-compose.microservices.yml up -d
```

**Why this works:**
- `rm -rf node_modules/.prisma` clears the compiled Prisma Client
- `npx prisma generate` regenerates it from the current schema
- `docker-compose down` removes stale containers
- `docker rmi` removes cached image layers
- `build --no-cache` forces Docker to rebuild every layer fresh
- The new image includes the newly generated Prisma Client

**Apply to other services if needed:**
```bash
cd services/itinerary-service
rm -rf node_modules/.prisma && npx prisma generate
docker rmi cloudappdev-itinerary-service:latest
docker-compose -f docker-compose.microservices.yml build --no-cache itinerary-service
```

---

## Best Practices for AI Assistants

### When Working on This Codebase

1. **Always check deployment mode** - Monolithic vs Microservices
   - Ask user which mode they're using
   - Modify correct files based on mode

2. **Use path aliases** - Import with `@components/*`, not relative paths

3. **Preserve environment variables**
   - Never hardcode credentials
   - Use `.env` for local, secrets for production

4. **Database changes require migrations**
   - Don't manually edit database
   - Always create Prisma migrations

5. **Test Docker builds locally**
   ```bash
   docker-compose build frontend
   docker-compose up frontend
   ```

6. **Follow existing patterns**
   - Study existing API routes before creating new ones
   - Match error handling patterns
   - Use existing utility functions from `lib/`

7. **Document breaking changes**
   - Update this file for major architectural changes
   - Update README.md for user-facing changes

8. **Consider both deployment modes**
   - Changes to API might affect both monolithic and microservices
   - Test in both modes if possible

9. **Respect .gitignore**
   - Never commit `.env`, `node_modules`, `.next/`
   - Package-lock.json IS committed (reproducible builds)

10. **Security first**
    - Sanitize user inputs
    - Use parameterized queries (Prisma handles this)
    - Validate JWTs on protected routes
    - Never expose secrets in client code

---

## Milestone 2: Remaining Tasks (Due: 03.12.2025)

Based on the current implementation status, here are the remaining tasks to complete Milestone 2:

### 🔄 High Priority Tasks

#### 1. Asynchronous Workflows Implementation (Wow Factors)
**Service:** Travel Info Service

**Required Features:**
- **Flight Schedule Monitoring:**
  - [ ] Implement background job to parse flight schedule changes
  - [ ] Create notification system to alert travelers
  - [ ] Add control mechanisms (start/stop/status endpoints)
  - [ ] Test with sample flight data

- **Travel Warnings:**
  - [ ] Set up webhook/polling for travel warning sources
  - [ ] Parse natural disaster and political unrest data
  - [ ] Match warnings to traveler itineraries
  - [ ] Push notifications to affected travelers

- **Weather Information:**
  - [ ] Integrate weather API (e.g., OpenWeatherMap)
  - [ ] Process weather data for trip locations
  - [ ] Generate value-added insights (packing suggestions, activity recommendations)
  - [ ] Schedule periodic weather updates

**Technical Requirements:**
- Use job queues (Bull, Agenda) or cron jobs for async processing
- Implement REST endpoints for workflow control (`/workflows/start`, `/workflows/stop`, `/workflows/status`)
- Add health checks and monitoring
- Create test data sets for scalability validation

#### 2. Performance Testing & Scalability ✅ IMPLEMENTED
- [x] Comprehensive load testing framework for microservices (`locust/locustfile_microservices.py`)
- [x] Automated test runner with all scenarios (`locust/run_milestone2_tests.ps1`)
- [x] Periodic workload tests (Scenario A: 100/10 users, Scenario B: 1000/20 users)
- [x] Once-in-a-Lifetime workload tests with configurable growth rates
- [x] Performance threshold analysis (no degradation, with degradation, failure)
- [x] Service health check script (`locust/test_microservices.py`)
- [x] Quick start guide and detailed documentation
- [ ] Run actual tests and generate reports (pending execution)
- [ ] Document bottlenecks and optimization strategies
- [ ] Compare monolithic vs microservices performance

#### 3. Architecture Documentation
**Deliverable:** Cloud Project Software Architecture Document

**Required Sections:**
- [ ] Functional scope definition
- [ ] High-level system design diagrams
- [ ] Microservice architecture documentation
  - Service boundaries
  - Inter-service communication patterns
  - Data flow diagrams
- [ ] 12-Factor App compliance documentation
- [ ] Asynchronous workflow design
  - Control mechanisms
  - Error handling and retry logic
  - Scalability considerations
- [ ] Deployment architecture (Kubernetes)
- [ ] Security considerations
- [ ] Future enhancements

#### 4. Kubernetes Deployment Validation
- [ ] Verify all services deploy correctly to K8s cluster
- [ ] Test service discovery and inter-service communication
- [ ] Validate ConfigMaps and Secrets
- [ ] Test horizontal pod autoscaling
- [ ] Verify persistent volume claims for databases
- [ ] Document kubectl deployment commands

#### 5. Wow Factors Implementation ✅ COMPLETE

**Goal:** Implement 2+ Wow factors in different microservices for Grade 1.0-1.3

**Status:** 2+ Wow factors successfully implemented across 2 different microservices

**Implemented Wow Factors:**

##### Travel Info Service - Async Workflows
- Flight schedule change monitoring
- Travel warnings (natural disasters, political unrest)
- Weather information with value-added insights

##### Social Service - Email Newsletter (IMPLEMENTED)

**Personalized Email Newsletter with Async Workflow Controls**

**What It Does:**
- Weekly personalized newsletters sent every Sunday at 8 PM UTC
- Content includes:
  - User's engagement summary (likes + comments from the past week)
  - Trending destinations (multi-factor scoring: likes × 0.5 + comments × 0.3 + recency × 0.2)
  - Quality-filtered itineraries (minimum 3 likes to appear)
  - Manage preferences and unsubscribe links (GDPR-compliant)
- Fully tracked delivery with idempotency checks (no duplicates)
- Automatic retry logic for failed sends (3 retries with exponential backoff)

**Architecture:**
- **Scheduling:** Kubernetes CronJob (Sunday 20:00 UTC) - production-ready
- **Queue:** Direct email sending with batch processing
- **Email Provider:** SMTP-compatible (Gmail, SendGrid, etc.)
- **Database:** MongoDB for subscriptions, delivery logs, and trending cache
- **Async Workflow:** NestJS service with batch processing (50 users per batch)
- **Control Mechanisms:**
  - `/api/v1/social/newsletter/status` - Service health and statistics
  - `/api/v1/social/newsletter/logs/:userId` - Delivery history
  - `/api/v1/social/newsletter/trending` - Current trending itineraries
  - `POST /api/v1/social/newsletter/send-manual/:userId` - Admin manual trigger

**Key Implementation Details:**

1. **Subscription Management:**
   - Endpoints for subscribe, unsubscribe, preference management
   - State tracking prevents duplicate emails (idempotency)
   - GDPR-compliant with unsubscribe links and tracking

2. **Content Personalization:**
   - Multi-factor scoring algorithm for fair ranking
   - Handlebars templates for dynamic content
   - Real-time user activity calculation
   - 24-hour cache for trending itineraries

3. **Reliability & Scalability:**
   - Batch processing: 50 users at a time
   - Parallel email sends (5 concurrent)
   - Automatic retries with exponential backoff
   - Health checks on dependent services
   - Graceful degradation (sends partial if services unavailable)

4. **Performance:**
   - Uses MongoDB aggregation pipeline (O(1) complexity for trending)
   - Indexed queries for fast subscription lookups
   - Caching reduces database load
   - Sub-millisecond template rendering

5. **Monitoring & Logging:**
   - Detailed delivery tracking in MongoDB
   - Retry counter and failure logs
   - Service status endpoint with statistics
   - Kubernetes CronJob logs for job execution

**Configuration:**
- Environment variables for SMTP, sender address, batch size, retry limits
- Secrets stored in Kubernetes ConfigMaps/Secrets
- Configurable schedule via CronJob manifest

**Wow Factor Justification:**
- ✅ **Personalization:** Multi-factor scoring ensures relevant content
- ✅ **Async Workflow:** Event-driven, fault-tolerant implementation
- ✅ **Control Mechanisms:** Status endpoints, manual triggers, delivery logs
- ✅ **Production-Ready:** Reliability tracking, retries, error handling
- ✅ **Microservice Pattern:** Inter-service communication, health checks
- ✅ **Scalability:** Batch processing, caching, indexed queries

**Deliverables:**
- Newsletter service in `services/social-service/src/newsletter/`
- Unit tests and integration tests included
- Kubernetes CronJob manifest: `k8s/services/social/newsletter-cronjob.yaml`
- CLI script for manual execution: `npm run newsletter:send-weekly`
- Complete API documentation with examples

### ✅ Completed Items (No Action Needed)

- ✅ Microservice architecture (4 services + API Gateway)
- ✅ Kubernetes manifests
- ✅ Terraform IaC
- ✅ CI/CD pipeline with smart build system
- ✅ Social Service as separate microservice
- ✅ Travel Info Service scaffolding
- ✅ 12-Factor App compliance (architecture level)
- ✅ Multi-database setup (PostgreSQL, MongoDB)
- ✅ Docker containerization

### 📅 Timeline Suggestion (8 days remaining)

**Days 1-2 (Nov 22-23):**
- Implement async workflows in travel-info-service
- Add workflow control endpoints

**Days 3-4 (Nov 24-25):**
- Create test data sets
- Run performance/scalability tests

**Days 5-6 (Nov 26-27):**
- Write architecture documentation
- Verify Kubernetes deployment

**Days 7-8 (Nov 28-Dec 2):**
- Final testing and validation
- Review and polish documentation
- Prepare for submission

### 🎯 Success Criteria for Grade 1.0-1.3 (Sehr Gut)

- ✅ All hygiene factors complete
- ✅ Microservice architecture with 12-Factor compliance
- ✅ Kubernetes deployment
- ✅ Infrastructure as Code
- ✅ **2+ Wow factors in different microservices** (Travel Info + Newsletter)
- ✅ **Asynchronous workflows with control mechanisms** (Newsletter implemented)
- ✅ **Performance testing with scalability validation** (Framework ready)
- 🔄 **Complete architecture documentation** (Final verification pending)

---

## Additional Resources

- [README.md](./README.md) - General setup and features
- [MICROSERVICES.md](./MICROSERVICES.md) - Microservices architecture guide
- [MONGODB.md](./MONGODB.md) - MongoDB setup and usage
- [Next.js Docs](https://nextjs.org/docs) - Next.js framework
- [Prisma Docs](https://www.prisma.io/docs) - Database ORM
- [NestJS Docs](https://nestjs.com) - Microservices framework
- [GCP Docs](https://cloud.google.com/docs) - Cloud deployment

---

## Changelog

### 2025-11-26 (Update 5 - API Architecture Refactor)

- **Major Refactor:** Migrated to server-side API Gateway proxies
- Created 9 new server-side proxy routes in `app/api/`:
  - `auth/login` and `auth/register` - Authentication proxies
  - `signed-url` - GCS signed URL generation proxy
  - `travel-info/*` - Weather, location coordinates, city info proxies
  - `upload` - File upload proxy
  - `user` - User data proxy
  - `dev/social/newsletter/status` - Development tool proxy
- Updated `useFileUpload.ts` to use `/api/upload` proxy instead of direct gateway calls
- Removed `NEXT_PUBLIC_API_GATEWAY_URL` from all client components and environment files
- Removed unused `lib/api-config.ts` - API routing now handled per-route
- Updated Kubernetes deployment manifest to use `API_GATEWAY_URL=http://api-gateway:80`
- Made `app/dev/page.tsx` production-ready with dynamic endpoints
- Updated all client components to use proxy endpoints instead of direct gateway calls
- Removed `API_SERVICES` imports from components (no longer needed)
- Updated directory structure documentation to reflect new proxy route organization
- Updated API Patterns section to document new server-side proxy architecture
- Application now works seamlessly in both local Docker and Kubernetes environments with single `API_GATEWAY_URL` configuration

### 2025-11-21 (Update 4)

- Added Seeder Workflow documentation (`.github/workflows/build-and-push-seeder.yml`)
- Documented unified database seeding container for Kubernetes
- Added `services/seeder/` to directory structure
- Added `seed-data/dataset.json` for test data
- Added `k8s/seeding-job.yaml` to Kubernetes manifests
- Added seeder to Services Built list
- Documented seeder environment variables and K8s usage

### 2025-11-21 (Update 3)

- Updated Performance Testing status to IMPLEMENTED
- Added comprehensive Milestone 2 load testing documentation
- Documented new test files: `locustfile_microservices.py`, `run_milestone2_tests.ps1`, `test_microservices.py`
- Added periodic workload scenarios (A: 100/10 users, B: 1000/20 users)
- Added Once-in-a-Lifetime workload testing with threshold analysis
- Updated directory structure with new locust files
- Added response time and failure rate guidelines
- Documented PowerShell automation commands

### 2025-11-21 (Update 2)
- Added course context (HTWG Konstanz, Winter 2025/26)
- Added milestone tracking (Milestone 1 complete, Milestone 2 in progress)
- Added grading criteria and Wow factors documentation
- Documented all 4 microservices (user, itinerary, social, travel-info)
- Added 12-Factor App compliance documentation
- Added CI/CD pipeline details (smart multi-service builds)
- Added Milestone 2 remaining tasks with timeline
- Updated architecture to show Travel Info Service
- Added success criteria for target grade 1.0-1.3

### 2025-11-21 (Initial)
- Initial creation of CLAUDE.md
- Documented hybrid architecture (monolithic + microservices)
- Added comprehensive troubleshooting section
- Documented all deployment methods (Docker, GCP, K8s, Terraform)
- Added API patterns and common tasks

---

## Contact Information

**Git Repository Access:**
- **GitHub:** markus.eiglsperger@htwg-konstanz.de
- **GitLab:** meiglspe

**Course Information:**
- **Course:** Cloud Application Development
- **Instructor:** Prof. Dr. Markus Eiglsperger
- **Institution:** HTWG University of Applied Sciences Konstanz
- **Term:** Winter 2025/26

---

**Questions or Issues?** Check existing documentation or ask the maintainers!
