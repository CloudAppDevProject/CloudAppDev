# CLAUDE.md - AI Assistant Guide

> **Last Updated:** November 21, 2025
> **Purpose:** Comprehensive guide for AI assistants working with this codebase

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

**CloudAppDev** is a full-stack cloud application for travel itinerary management with a hybrid architecture supporting both monolithic and microservices deployments.

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

#### 2. Microservices Mode
- **API Gateway** (Nginx on port 8000) - single entry point
- **User Service** (NestJS on port 8080) - Firebase Auth, user management
- **Itinerary Service** (NestJS on port 8081) - itinerary CRUD, GCS integration
- **Social Service** (NestJS on port 8082) - comments, likes with MongoDB
- Each service has its own database (PostgreSQL 5433, 5434; MongoDB 27017)
- Uses `docker-compose.microservices.yml`

### Communication Flow

```
Client/Frontend (Next.js)
    ↓
API Gateway (Nginx :8000)
    ↓
├── User Service (NestJS :8080) → PostgreSQL :5433
├── Itinerary Service (NestJS :8081) → PostgreSQL :5434 + GCS
└── Social Service (NestJS :8082) → MongoDB :27017
```

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

## Directory Structure

```
CloudAppDev/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (monolithic mode)
│   │   ├── comments/             # Comment endpoints
│   │   ├── itineraries/          # Itinerary endpoints
│   │   ├── likes/                # Like endpoints
│   │   └── user/                 # User endpoints
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
├── services/                     # NestJS Microservices
│   ├── user-service/             # User management
│   │   ├── src/                  # NestJS source code
│   │   ├── prisma/               # Prisma schema
│   │   ├── test/                 # Tests
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── itinerary-service/        # Itinerary management
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── social-service/           # Social interactions
│   │   ├── src/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── travel-info-service/      # Additional service
│
├── lib/                          # Shared utilities
│   ├── api-config.ts             # API service URLs
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
│   └── locustfile.py
│
├── .github/workflows/            # CI/CD pipelines
│   ├── build-and-push-app.yml
│   └── build-and-push-microservices.yml
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

### Monolithic API Routes

Located in `app/api/`:

```typescript
// app/api/itineraries/route.ts
export async function GET(request: Request) {
  try {
    const itineraries = await prisma.itinerary.findMany();
    return Response.json(itineraries);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  // Handle POST logic
}
```

### Microservices API

Uses NestJS controllers:

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

### API Configuration

Centralized in `lib/api-config.ts`:

```typescript
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8000';

export const API_SERVICES = {
  USER_SERVICE: `${API_GATEWAY_URL}/api/v1/users`,
  ITINERARY_SERVICE: `${API_GATEWAY_URL}/api/v1/itineraries`,
  SOCIAL_SERVICE: `${API_GATEWAY_URL}/api/v1/social`,
};
```

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

Using Locust (Python):

```bash
# Install
pip install locust

# Run load test
locust -f locust/locustfile.py --host=http://localhost:3000

# Open browser: http://localhost:8089
```

**Key Performance Metrics:**
- See `README.md` for IaaS vs PaaS comparison
- `paasincresed.html` contains benchmark results

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

```bash
cd terraform

# Initialize
terraform init

# Plan changes
terraform plan

# Apply infrastructure
terraform apply

# Destroy (careful!)
terraform destroy
```

**Files:**
- `main.tf` - Main resources
- `network-config.tf` - VPC, subnets
- `service-accounts.tf` - IAM
- `secrets.tf` - Secret Manager
- `variables.tf` - Input variables
- `terraform.tfvars` - Values (gitignored)

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

### 2025-11-21
- Initial creation of CLAUDE.md
- Documented hybrid architecture (monolithic + microservices)
- Added comprehensive troubleshooting section
- Documented all deployment methods (Docker, GCP, K8s, Terraform)
- Added API patterns and common tasks

---

**Questions or Issues?** Check existing documentation or ask the maintainers!
