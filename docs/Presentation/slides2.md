---
theme: default
background: https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## CloudAppDev - Milestone 2
  Microservices Architecture auf Google Kubernetes Engine
drawings:
  persist: false
transition: slide-left
title: CloudAppDev - Milestone 2
mdc: true
---

# CloudAppDev
## Milestone 2: Microservices & Kubernetes

Von Monolith zu Distributed Architecture

<div class="absolute bottom-10 left-10 text-sm opacity-75">
  <div>Simon Driescher, Samuel Behrmann, Simon Blaser</div>
</div>

---

# System Context

<div class="flex justify-center items-center h-full">
  <img src="/system-context-diagram.drawio.svg" alt="System Context Diagram" class="max-h-96" />
</div>

---

# System Context & Features

<div>

### Core Features

✈️ **User Management** - Registration, profiles, avatars

🗺️ **Itinerary Management** - CRUD operations, multi-location trips

🔍 **Search & Discovery** - Find trips by destination, keywords

💬 **Social Interaction** - Likes, comments, engagement

📍 \*NEW\* **Interactive Maps** - Leaflet integration, location selection

📧 \*NEW\* **Personalized Newsletter** - Interest-based recommendations

🌤️ \*NEW\* **Weather Insights** - Forecasts, warnings, travel advice

</div>

---

# Evolution: Monolith → Microservices

<div class="grid grid-cols-2 gap-8 mt-8">

<div>

### Milestone 1 (Monolith)

- Next.js Fullstack Application
- PostgreSQL + MongoDB
- Cloud Run (PaaS)
- Compute Engine (IaaS)

</div>

<div>

### Milestone 2 (Microservices)

- 5 spezialisierte Services
- PostgreSQL (User + Itinerary)
- MongoDB (Social Service)
- Google Kubernetes Engine (GKE)

</div>

</div>

<div class="absolute bottom-10 right-10 flex gap-4 items-center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg" class="w-16 h-16" alt="Kubernetes" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" class="w-16 h-16" alt="PostgreSQL" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" class="w-16 h-16" alt="MongoDB" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" class="w-16 h-16" alt="Google Cloud" />
</div>

---
layout: center
class: text-center
---

# Microservices Architecture

<div class="mt-8 text-xl">
Domain-Driven Design mit klaren Service-Boundaries
</div>

---

# Domain Model

<div class="flex justify-center items-center h-full">
  <img src="/domain-model.drawio.svg" alt="Domain Model" class="max-h-96" />
</div>

---

# Repository Structure

<div class="grid grid-cols-2 gap-8 mt-2">

<div>

### Monorepo Organization

```
/app            - Next.js Frontend
/services       - Backend Microservices
  ├── user-service
  ├── itinerary-service
  ├── social-service
  ├── travel-info-service
  └── seeder
/nginx          - API Gateway Config
/k8s            - Kubernetes Manifests
/terraform      - IaC for GCP
/locust         - Performance Tests
/seed-data      - Initial Dataset
```

</div>

<div>

### Technology Stack

**Frontend:**
- Next.js 15.5.4 + React 19.1.0
- PrimeReact 10.9.7 UI Components
- Tailwind CSS 4

**Backend:**
- Prisma 6.19.0 ORM
- Mongoose 8.8.4 ODM

**External Services:**
- Google Cloud Storage
- SendGrid Email API
- Weather APIs

</div>

</div>

---

# Service Übersicht

<div class="grid grid-cols-2 gap-6 mt-6">

<div class="p-4 rounded-lg" style="background-color: #1f1d2e; border: 2px solid #eb6f92;">
<div class="text-lg font-bold mb-2" style="color: #eb6f92;">User Service (Port 8080)</div>
<div class="text-sm" style="color: #908caa;">
- User Registration & Management<br/>
- NestJS + Prisma + PostgreSQL
</div>
</div>

<div class="p-4 rounded-lg" style="background-color: #1f1d2e; border: 2px solid #9ccfd8;">
<div class="text-lg font-bold mb-2" style="color: #9ccfd8;">Itinerary Service (Port 8081)</div>
<div class="text-sm" style="color: #908caa;">
- Travel Route CRUD Operations<br/>
- NestJS + Prisma + PostgreSQL
</div>
</div>

<div class="p-4 rounded-lg" style="background-color: #1f1d2e; border: 2px solid #c4a7e7;">
<div class="text-lg font-bold mb-2" style="color: #c4a7e7;">Social Service (Port 8082)</div>
<div class="text-sm" style="color: #908caa;">
- Likes & Comments System<br/>
- Newsletter Subscriptions<br/>
- NestJS + Mongoose + MongoDB
</div>
</div>

<div class="p-4 rounded-lg" style="background-color: #1f1d2e; border: 2px solid #f6c177;">
<div class="text-lg font-bold mb-2" style="color: #f6c177;">Travel Info Service (Port 8083)</div>
<div class="text-sm" style="color: #908caa;">
- Weather Data Integration<br/>
- Travel Warnings & Safety Info<br/>
- NestJS + Axios
</div>
</div>

</div>

<div class="p-4 rounded-lg mt-6 mx-auto" style="max-width: 600px; background-color: #1f1d2e; border: 2px solid #31748f;">
<div class="text-lg font-bold mb-2 text-center" style="color: #31748f;">API Gateway (Nginx Port 8000)</div>
<div class="text-sm text-center" style="color: #908caa;">Routing, Load Balancing, 50MB Upload Support, TLS Termination</div>
</div>

---

<div class="flex justify-center items-center h-full">
  <img src="/Micro-Architektur.drawio.svg" alt="Microservices Architecture" class="max-h-full" />
</div>

---
# Gateway Route
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: user-route
spec:
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1/users
    backendRefs:
    - name: user-service
      port: 80
```

**Features:**
- Cloud SQL Proxy für DB-Zugriff
- Secrets Management
- Health Checks (liveness/readiness)

</div>

</div>

---

# API Gateway Configuration

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="max-h-96 overflow-auto">

```nginx
# Upstream Service Definitions
upstream user_service {
  server user-service:8080;
}
upstream itinerary_service {
  server itinerary-service:8081;
}
upstream social_service {
  server social-service:8082;
}
upstream travel_info_service {
  server travel-info-service:8083;
}
server {
  listen 8000;
  location /api/v1/users {
    proxy_pass http://user_service;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
  location /api/v1/itineraries {
    proxy_pass http://itinerary_service;
  }
  location /api/v1/social {
    proxy_pass http://social_service;
  }
  location /api/v1/travel-info {
    proxy_pass http://travel_info_service;
  }
}
```

</div>

<div>

### Gateway Features

**Routing & Load Balancing:**
- Round-robin distribution
- Service discovery via DNS
- Connection pooling

**Performance:**
- Sub-10ms routing latency
- 700+ req/sec capacity
- Request buffering


</div>

</div>

---
layout: center
class: text-center
---

# Performance Testing

<div class="mt-8 text-xl">
Locust Framework mit realistischen Workloads
</div>

---

# Test Setup & Data Initialization

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

### Seed Data

**Database State:**
- 10 diverse users (Emma, Liam, Sofia, ...)
- 18 itineraries across 6 continents
- 4 comments, 11 likes
- Trending: Rome Colosseum, Tokyo Tech, Vienna

**Coverage:**
- Rome, Barcelona, Tokyo, Kyoto
- Iceland, Norway, Bangkok, Mumbai
- New Zealand, Australia, Russia
- Switzerland, Vienna, Paris, Costa Rica

</div>

<div>

### User Journeys

**Casual Browsers (50%)**
- Quick browse (5x)
- Search destinations (3x)
- View popular itineraries (2x)
- Optional registration (1x)

**Active Users (30%)**
- Browse & like (4x)
- Check own itineraries (3x)
- Create new route (2-4 locations)
- Comment on posts (3x)

**New Users (20%)**
- Register account
- Browse popular (3x)
- Create first itinerary
- Engage with content

</div>

</div>

---

# Scenario A: 100 Peak / 10 Low Users

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

### Load Pattern

```
Users
100 ┤     ████████████           ████████████
    │    ╱            ╲         ╱            ╲
 50 ┤   ╱              ╲       ╱              ╲
    │  ╱                ╲     ╱                ╲
 10 ┼══                  ═════                  ═══
    └───────────────────────────────────────────→ Time
    0    3m   5m    8m  10m  12m  14m
        [Cycle 1]         [Cycle 2]
```

**Duration:** ~14 minutes (2 cycles)
- Low: 2min @ 10 users
- Ramp up: 1min → 100 users
- Peak: 3min @ 100 users
- Ramp down: 1min → 10 users

</div>

<div>

### Performance Metrics

**Throughput:** 60-80 req/sec

**Response Times:**
- p95 < 800ms @ peak
- p99 < 1500ms
- Error rate < 0.5%

**Resource Utilization:**
- User Service: CPU 15-25%, Mem 100MB
- Itinerary Service: CPU 20-35%, Mem 150MB
- Social Service: CPU 10-15%, Mem 80MB
- PostgreSQL: CPU 30-40%
- MongoDB: < 100ms queries

**Analysis:**
System handles daily spikes efficiently. Latency remains acceptable, horizontal scaling not yet required.

</div>

</div>

---

# Scenario B: 1000 Peak / 20 Low Users

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

### Load Pattern

```
Users
1000 ┤      ██████████████████        ██████████████████
     │     ╱                  ╲      ╱                  ╲
 500 ┤    ╱                    ╲    ╱                    ╲
     │   ╱                      ╲  ╱                      ╲
  20 ┼═══                        ══                        ═══
     └────────────────────────────────────────────────────→ Time
     0     4m    6m     13m  15m   19m   21m    28m  30m
          [Cycle 1]                [Cycle 2]
```

**Duration:** ~30 minutes (2 cycles)
- Low: 4min @ 20 users
- Ramp up: 2min → 1000 users
- Peak: 7min @ 1000 users
- Ramp down: 2min → 20 users

</div>

<div>

### Performance Metrics

**Throughput:** 600-800 req/sec

**Response Times:**
- p95: 1500-2000ms (3x degradation)
- p99: 3000ms+
- Error rate: 0.5-2% @ peak

**Bottleneck: PostgreSQL Connection Pool**
- 20 connections/service (40 total)
- Queue saturation @ 450+ users
- 500-2000ms delays on simple queries

**Mitigation Strategy:**
- PgBouncer: 200+ connections
- Read replicas for Itinerary reads
- Circuit breaker @ p95 > 1500ms

</div>

</div>

---

# Once-in-a-Lifetime Workload

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

### Continuous Growth Pattern

```
Users
610 ┤                                              ╱
    │                                            ╱
500 ┤                                          ╱
    │                                        ╱
400 ┤                                      ╱
    │                                    ╱
300 ┤                                  ╱
    │                                ╱
200 ┤                              ╱
    │                            ╱
100 ┤                          ╱
    │                        ╱
 10 ┼═════════════════════════
    └─────────────────────────────────────────────→ Time
    0        10m       20m       30m
```

**Growth:** 20 users/minute
**Formula:** `users = 10 + (20 × minutes)`
**Max cap:** 3000 users (safety)

</div>

<div>

### Breaking Points

| Users | Req/sec | p95 | Error | State |
|-------|---------|-----|-------|-------|
| 50 | 60 | 200ms | <0.1% | ✅ Green |
| 150 | 180 | 400ms | <0.5% | ✅ Green |
| 250 | 300 | 1000ms | 1.5% | ⚠️ Yellow |
| 350 | 420 | 1500ms | 3% | 🔴 Red |
| 450 | 540 | 2000ms | 5% | 🔴 Critical |
| 550+ | 660+ | 3000ms+ | 10%+ | ⚫ Failed |

**Primary Bottleneck:**
PostgreSQL connection pool exhaustion

**Secondary:**
MongoDB disk I/O @ 500+ users

</div>

</div>

---

# Performance Thresholds

<div class="grid grid-cols-3 gap-6 mt-12">

<div class="p-6 rounded-lg" style="background-color: #1f1d2e; border: 3px solid #9ccfd8;">
<div class="text-2xl font-bold mb-4 text-center" style="color: #9ccfd8;">No Degradation</div>
<div class="text-sm" style="color: #908caa;">
<strong>Load:</strong> ~200 users (240 req/sec)<br/>
<strong>Criteria:</strong> p95 < 500ms, error < 1%<br/>
<strong>PostgreSQL:</strong> CPU < 40%<br/>
<strong>Status:</strong> All services healthy
</div>
</div>

<div class="p-6 rounded-lg" style="background-color: #1f1d2e; border: 3px solid #f6c177;">
<div class="text-2xl font-bold mb-4 text-center" style="color: #f6c177;">With Degradation</div>
<div class="text-sm" style="color: #908caa;">
<strong>Load:</strong> 200-450 users (240-540 req/sec)<br/>
<strong>Criteria:</strong> p95 < 2000ms, error < 5%<br/>
<strong>Connection Pool:</strong> 80%+ utilized<br/>
<strong>Status:</strong> Functional but slower
</div>
</div>

<div class="p-6 rounded-lg" style="background-color: #1f1d2e; border: 3px solid #eb6f92;">
<div class="text-2xl font-bold mb-4 text-center" style="color: #eb6f92;">Failure</div>
<div class="text-sm" style="color: #908caa;">
<strong>Load:</strong> 450+ users (540+ req/sec)<br/>
<strong>Criteria:</strong> p95 ≥ 2000ms OR error ≥ 5%<br/>
<strong>Connection Pool:</strong> Exhausted<br/>
<strong>Status:</strong> Cascading timeouts
</div>
</div>

</div>

<div class="mt-12 text-center" style="color: #908caa;">
System exhibits <strong style="color: #c4a7e7;">graceful degradation</strong> — casual browsing degrades first, existing reads remain responsive
</div>

---

# Bottleneck Analysis

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

### Primary: PostgreSQL Connection Pool

**Problem:**
- 20 connections per service (40 total)
- Queue saturation @ 450+ users
- 500-2000ms delays vs. 10-50ms baseline

**Impact:**
- Itinerary creation slows significantly
- Registration fails (1-2% error rate)
- Cascading timeouts across services

**Solution:**
```yaml
# PgBouncer Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  template:
    spec:
      containers:
      - name: pgbouncer
        env:
        - name: POOL_MODE
          value: "session"
        - name: MAX_CLIENT_CONN
          value: "200"
```

</div>

<div>

### Recommended Optimizations

**1. Connection Pooling**
- Deploy PgBouncer (200+ connections)
- Session-based pooling mode

**2. Read-Write Splitting**
- Route reads to replicas
- Writes to primary only

**3. Cache Layer**
- Redis for popular itineraries
- 60-second TTL

**4. Circuit Breaker**
- Reject registrations @ p95 > 1500ms
- Queue overflow protection

**5. Rate Limiting**
- 100 req/min per user
- 1000 req/sec global cap

</div>

</div>

---

# Runtime Overview

<div class="mt-8">

**Live Application:** [CloudAppDev.site](https://cloudappdev.site)

**GCP Project:** oceanic-citadel-474512-c1

</div>

<div class="grid grid-cols-2 gap-6 mt-8">

<div>

### Infrastructure Links

🔧 [GKE Workloads](https://console.cloud.google.com/kubernetes/workload/overview?project=oceanic-citadel-474512-c1)

🌐 [GKE Gateways](https://console.cloud.google.com/kubernetes/gateways?project=oceanic-citadel-474512-c1)

🗄️ [Cloud SQL Instances](https://console.cloud.google.com/sql/instances?project=oceanic-citadel-474512-c1)

🔥 [Firestore Databases](https://console.cloud.google.com/firestore/databases?project=oceanic-citadel-474512-c1)

</div>

<div>

### Architecture Highlights

- **5 Microservices** on GKE Autopilot
- **2 PostgreSQL** instances (Users, Itineraries)
- **1 MongoDB** instance (Social data)
- **Nginx Gateway** for routing
- **Google Cloud Storage** for images
- **SendGrid API** for newsletters

</div>

</div>

---

# Deployment Automation

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

### CI/CD Pipeline

```bash
# Build & Push Container Images
docker build -t gcr.io/$PROJECT/user-service \
  ./services/user-service
docker push gcr.io/$PROJECT/user-service

# Deploy to Kubernetes
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml
kubectl apply -f k8s/gateway.yaml

# Verify Deployment
kubectl rollout status deployment/user-service
kubectl get pods -l app=user-service
```

**Rolling Updates:**
- Zero-downtime deployment
- Gradual replica replacement
- Automatic rollback on failure

</div>

<div>

### Health Checks

```yaml
# Liveness & Readiness Probes
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: user-service
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Monitoring:**
- Pod restart counts
- Service availability
- Request latency (p50, p95, p99)

</div>

</div>

---

# DevOps: Infrastructure as Code

<div class="grid grid-cols-2 gap-8 mt-8">

<div>

### Terraform (GCP Resources)

**Managed Services:**
- Cloud SQL (PostgreSQL 16)
- Firestore (NoSQL)
- Cloud Storage Buckets
- Service Accounts & IAM Roles

```hcl
resource "google_sql_database_instance" "users" {
  database_version = "POSTGRES_16"
  region           = "europe-west1"
  
  settings {
    tier = "db-custom-2-8192"
    backup_configuration {
      enabled = true
    }
  }
}
```

</div>

<div>

### Helm & Kubernetes

**Cluster Resources:**
- External & Internal Gateways
- HTTP Routes
- Service Health Checks
- GKE Service Accounts

**Per Microservice:**
1. Deployment (service code)
2. Kubernetes Service (networking)
3. Horizontal Pod Autoscaler
4. Secrets (env vars, keys, tokens)

</div>

</div>

---

# Key Learnings

<div class="grid grid-cols-2 gap-8 mt-8">

<div>

### Architectural Benefits

✅ **Service Isolation**
- Independent deployment & scaling
- Technology flexibility per service
- Fault isolation (cascading failures prevented)

✅ **Scalability**
- Horizontal pod autoscaling
- Targeted resource allocation
- Cost-efficient compute usage

✅ **Maintainability**
- Clear domain boundaries
- Easier testing & debugging
- Team ownership per service

</div>

<div>

### Operational Complexity

⚠️ **Distributed System Challenges**
- Network latency overhead
- Service discovery requirements
- Complex debugging across services

⚠️ **Database Bottlenecks**
- Connection pool exhaustion @ 450+ users
- Requires PgBouncer for production
- Read-write splitting needed

⚠️ **Infrastructure Management**
- Kubernetes learning curve
- Monitoring & observability critical
- More moving parts to manage

</div>

</div>

---
layout: end
class: text-center
---

# Vielen Dank!

**CloudAppDev Milestone 2**

<div class="mt-12 text-sm opacity-75">
Microservices Architecture | Google Kubernetes Engine | Locust Performance Testing<br/>
Express.js + Prisma | PostgreSQL 16 + MongoDB | Nginx API Gateway
</div>
