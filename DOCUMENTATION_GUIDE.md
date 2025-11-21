# 📚 CloudAppDev Documentation Guide

**Last Updated**: 2025-11-21  
**Project**: CloudAppDev - Travel Itinerary Management System  
**Milestone**: 2 - Cloud-Native Applications

---

## 🎯 Quick Navigation

### For Getting Started
- 🚀 **[README.md](./README.md)** - Project overview, setup instructions, quick start
- 🌱 **[SEEDING_FINAL.md](./SEEDING_FINAL.md)** - Database seeding implementation guide

### For Daily Development
- 📋 **[services/seeder/QUICKSTART.md](./services/seeder/QUICKSTART.md)** - Quick reference for seeding operations
- 🔧 **[services/seeder/MAINTENANCE.md](./services/seeder/MAINTENANCE.md)** - Schema change procedures

### For Understanding Architecture
- 🏗️ **[services/seeder/README.md](./services/seeder/README.md)** - Seeding architecture & design decisions
- 🔄 **[MICROSERVICES.md](./MICROSERVICES.md)** - Microservice architecture overview
- 🗄️ **[MONGODB.md](./MONGODB.md)** - MongoDB setup and usage

---

## 📖 Documentation Structure

### Root Level Documents

```
CloudAppDev/
├── README.md                          ← Project overview & setup
├── SEEDING_FINAL.md                   ← Complete seeding implementation guide (3000+ lines)
├── MICROSERVICES.md                   ← Microservice architecture
├── MONGODB.md                         ← MongoDB documentation
├── example.env                        ← Environment variable template
└── ...
```

**Key Documents**:

1. **README.md** (Primary Entry Point)
   - Project overview
   - Database setup (PostgreSQL + MongoDB)
   - Quick start guide
   - Firebase & Google Cloud setup
   - Load testing instructions

2. **SEEDING_FINAL.md** (Database Seeding Guide)
   - Executive summary
   - Complete implementation details
   - Architecture diagrams
   - Testing procedures (35-minute test plan)
   - Deployment guide (dev & prod)
   - Troubleshooting

3. **MICROSERVICES.md**
   - Microservice architecture overview
   - Service descriptions
   - Inter-service communication

4. **MONGODB.md**
   - MongoDB setup
   - Schema documentation
   - Usage patterns

---

### Service-Specific Documentation

```
services/
├── seeder/                            ← Unified seeding service
│   ├── README.md                      ← Architecture & design (300+ lines)
│   ├── QUICKSTART.md                  ← Quick reference (150+ lines)
│   ├── MAINTENANCE.md                 ← Schema change procedures (350+ lines)
│   ├── seed.js                        ← Main seeding logic (200 lines)
│   ├── Dockerfile                     ← Container build
│   └── package.json
│
├── user-service/
│   └── README.md                      ← User service documentation
│
├── itinerary-service/
│   └── README.md                      ← Itinerary service documentation
│
└── social-service/
    └── README.md                      ← Social service documentation
```

**Seeder Documentation**:

1. **services/seeder/README.md** (Architecture Overview)
   - Why unified seeding container
   - Rejected alternatives (API orchestration, per-service jobs)
   - How it works (architecture diagrams)
   - Project structure
   - Environment variables
   - Seed data format
   - Troubleshooting
   - Security considerations

2. **services/seeder/QUICKSTART.md** (Daily Reference)
   - TL;DR summary
   - Local testing (10-minute workflow)
   - Production deployment (step-by-step)
   - Environment variables
   - Troubleshooting commands

3. **services/seeder/MAINTENANCE.md** (Schema Changes)
   - When service schemas change
   - User/Itinerary (Prisma/PostgreSQL) procedures
   - Social (MongoDB) procedures - **CRITICAL: field naming**
   - Testing workflows
   - Common pitfalls & solutions
   - Best practices

---

## 🗂️ Documentation by Use Case

### "I want to set up the project locally"
→ **Start here**: [README.md](./README.md)
1. Install dependencies: `npm install`
2. Configure environment: `cp example.env .env`
3. Start databases: `docker-compose up -d`
4. Initialize databases: `npm run db:deploy` + `npm run db:init-mongo`
5. Run app: `npm run dev`

### "I want to seed the databases"
→ **Quick reference**: [services/seeder/QUICKSTART.md](./services/seeder/QUICKSTART.md)  
→ **Complete guide**: [SEEDING_FINAL.md](./SEEDING_FINAL.md)

**Local seeding**:
```bash
cd services/user-service && npx prisma generate && cd ../..
cd services/itinerary-service && npx prisma generate && cd ../..
cd services/seeder && npm install
export USER_DATABASE_URL="postgresql://..."
export ITINERARY_DATABASE_URL="postgresql://..."
export SOCIAL_MONGODB_URI="mongodb://..."
npm run seed
```

**Kubernetes seeding**:
```bash
kubectl apply -f k8s/seeding-job.yaml
kubectl logs -f job/cloudappdev-seeder
```

### "I changed a Prisma schema"
→ **Guide**: [services/seeder/MAINTENANCE.md](./services/seeder/MAINTENANCE.md) - Section "When Service Schemas Change"

**Steps**:
1. Update schema in `services/{service}/prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name your_change`
3. Generate client: `npx prisma generate`
4. Update `seed.js` if field names changed
5. Update `dataset.json` if adding new fields
6. Test: `cd services/seeder && npm run seed`
7. Commit (CI/CD rebuilds automatically)

### "I changed a MongoDB schema"
→ **Guide**: [services/seeder/MAINTENANCE.md](./services/seeder/MAINTENANCE.md) - Section "Social Service (MongoDB)"

**CRITICAL**: Field names must use **camelCase** (NOT snake_case):
- ✅ `userId`, `itineraryId`, `text`, `createdAt`
- ❌ `user_id`, `itinerary_id`, `content`, `created_at`

**Steps**:
1. Update schema in `services/social-service/src/schemas/*.schema.ts`
2. **Manually update** `services/seeder/seed.js` with exact field names
3. Update `dataset.json` if structure changed
4. Test: `cd services/seeder && npm run seed`
5. Commit (CI/CD rebuilds)

### "I want to understand the seeding architecture"
→ **Start here**: [services/seeder/README.md](./services/seeder/README.md)  
→ **Complete analysis**: [SEEDING_FINAL.md](./SEEDING_FINAL.md) - Section "Why This Approach"

**Key Concepts**:
- Unified seeding container (single Docker image)
- Direct database access (no API calls)
- In-memory ID mapping (`Map<key, id>`)
- Runs as Kubernetes Job

**Alternatives evaluated and rejected**:
- ❌ API Gateway Orchestration (auth complexity, slow)
- ⚠️ Per-Service Kubernetes Jobs (complex state management)

### "Seeding is failing"
→ **Troubleshooting**: [SEEDING_FINAL.md](./SEEDING_FINAL.md) - Section "Troubleshooting"  
→ **Quick fixes**: [services/seeder/QUICKSTART.md](./services/seeder/QUICKSTART.md) - Section "Troubleshooting"

**Common issues**:
1. **MongoDB field mismatches** → Check camelCase vs snake_case
2. **Prisma client not found** → Run `npx prisma generate`
3. **Dataset path not found** → Set `SEED_DATA_PATH` env var
4. **Kubernetes job fails** → Check logs: `kubectl logs job/cloudappdev-seeder`

### "I want to deploy to production"
→ **Deployment guide**: [SEEDING_FINAL.md](./SEEDING_FINAL.md) - Section "Deployment Guide"

**Workflow**:
1. **Test locally** (10 min) - See QUICKSTART.md
2. **Test container** (5 min) - Docker build & run
3. **Deploy to K8s** (15 min) - Update PROJECT_ID, build, push, apply
4. **Verify** (5 min) - Check logs, query databases

---

## 🔍 Finding Information

### By Topic

| Topic | Document | Section |
|-------|----------|---------|
| **Initial Setup** | README.md | Database Setup |
| **Seeding Overview** | SEEDING_FINAL.md | Executive Summary |
| **Local Seeding** | services/seeder/QUICKSTART.md | Local Testing |
| **Kubernetes Seeding** | services/seeder/QUICKSTART.md | Production Deployment |
| **Schema Changes** | services/seeder/MAINTENANCE.md | When Service Schemas Change |
| **Architecture** | services/seeder/README.md | How It Works |
| **Troubleshooting** | SEEDING_FINAL.md | Troubleshooting |
| **Testing** | SEEDING_FINAL.md | Testing & Validation |
| **CI/CD** | SEEDING_FINAL.md | CI/CD Automation |
| **Security** | services/seeder/README.md | Security Considerations |
| **Microservices** | MICROSERVICES.md | (entire document) |
| **MongoDB** | MONGODB.md | (entire document) |

### By Role

**Developer (Daily Work)**:
1. README.md - Setup and quick start
2. services/seeder/QUICKSTART.md - Seeding reference
3. services/seeder/MAINTENANCE.md - Schema changes

**DevOps (Deployment)**:
1. SEEDING_FINAL.md - Complete deployment guide
2. k8s/ directory - Kubernetes manifests
3. .github/workflows/ - CI/CD pipelines

**Architect (Understanding)**:
1. services/seeder/README.md - Design decisions
2. SEEDING_FINAL.md - Complete analysis
3. MICROSERVICES.md - Architecture overview

**New Team Member**:
1. README.md - Start here!
2. SEEDING_FINAL.md - Comprehensive overview
3. services/seeder/QUICKSTART.md - Hands-on guide

---

## ✅ Documentation Checklist

When making changes, update these documents:

### Adding a New Service
- [ ] Update MICROSERVICES.md with service description
- [ ] Create service-specific README.md
- [ ] Update root README.md if it affects setup

### Changing Database Schema (Prisma)
- [ ] Update service Prisma schema
- [ ] Update seed.js if field names changed
- [ ] Update dataset.json if adding fields
- [ ] Note in services/seeder/MAINTENANCE.md if breaking change

### Changing Database Schema (MongoDB)
- [ ] Update service schema
- [ ] **CRITICAL**: Update seed.js with exact field names (camelCase)
- [ ] Update dataset.json if structure changed
- [ ] Document in services/seeder/MAINTENANCE.md

### Adding Seed Data
- [ ] Update seed-data/dataset.json
- [ ] Test locally: `cd services/seeder && npm run seed`
- [ ] Commit (CI/CD rebuilds automatically)

### Changing Seeding Logic
- [ ] Update services/seeder/seed.js
- [ ] Test both local and container: See QUICKSTART.md
- [ ] Update services/seeder/README.md if architecture changes
- [ ] Update SEEDING_FINAL.md if significant change

### Adding Documentation
- [ ] Update this guide (DOCUMENTATION_GUIDE.md) with reference
- [ ] Cross-reference from relevant existing docs
- [ ] Add to "Finding Information" table above

---

## 📊 Documentation Metrics

| Document | Lines | Purpose | Audience |
|----------|-------|---------|----------|
| **SEEDING_FINAL.md** | 3000+ | Comprehensive seeding guide | All |
| **README.md** | 500+ | Project overview & setup | All |
| **services/seeder/README.md** | 300+ | Architecture & design | Developers, Architects |
| **services/seeder/MAINTENANCE.md** | 350+ | Schema change procedures | Developers |
| **services/seeder/QUICKSTART.md** | 150+ | Quick reference | Developers, DevOps |
| **MICROSERVICES.md** | 200+ | Architecture overview | Architects |
| **MONGODB.md** | 150+ | MongoDB documentation | Developers |
| **DOCUMENTATION_GUIDE.md** | 400+ | This guide | All |

**Total Documentation**: ~5000+ lines

---

## 🎯 Documentation Principles

1. **Single Source of Truth**: Each topic has one primary document
2. **Cross-References**: Documents link to related information
3. **Layered Detail**: Overview → Quick Start → Deep Dive
4. **Use Case Driven**: Organized by what users need to do
5. **Keep Updated**: Update docs with code changes

---

## 🚀 Next Steps

- **New to the project?** → Start with [README.md](./README.md)
- **Need to seed?** → See [services/seeder/QUICKSTART.md](./services/seeder/QUICKSTART.md)
- **Making changes?** → Follow the checklists above
- **Stuck?** → Search this guide or check [SEEDING_FINAL.md](./SEEDING_FINAL.md) troubleshooting

---

**Maintained by**: CloudAppDev Team  
**Project**: HTWG Konstanz, Winter 2025/26  
**Milestone**: 2 - Cloud-Native Applications
