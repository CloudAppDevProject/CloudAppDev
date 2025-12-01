# Locust Load Testing - Microservices Architecture

> **Updated for Milestone 2**: Tests microservices architecture with API Gateway

## Overview

This directory contains load testing scripts for the CloudAppDev microservices architecture using Locust.

### Architecture Tested

```
┌─────────────────────────────────────────┐
│         API Gateway (Nginx)             │
│         Port 8000                       │
└────────┬────────────┬────────────┬──────┘
         │            │            │
    ┌────▼─────┐ ┌───▼──────┐ ┌──▼────────┐
    │  User    │ │Itinerary │ │  Social   │
    │ Service  │ │ Service  │ │ Service   │
    │  :8080   │ │  :8081   │ │  :8082    │
    └──────────┘ └──────────┘ └───────────┘
```

### API Endpoints Tested

- **User Service**: `POST /api/v1/users` (registration)
- **Itinerary Service**: 
  - `GET /api/v1/itineraries` (list/search)
  - `POST /api/v1/itineraries` (create)
  - `GET /api/v1/itineraries/:id` (view details)
- **Social Service**:
  - `POST /api/v1/social/likes/toggle` (like/unlike)
  - `POST /api/v1/social/comments` (add comment)
  - `GET /api/v1/social/comments/itinerary/:id` (view comments)

## Prerequisites

```bash
# Install Locust
pip install locust

# Or with requirements file
pip install -r locust/requirements.txt
```

## Files

- **`locustfile_microservices.py`**: Main load test file with custom load shapes
- **`locustfile.py`**: Legacy monolithic architecture tests
- **`run_milestone2_tests.ps1`**: PowerShell script to run all Milestone 2 test scenarios
- **`run_scenarios.ps1`**: Legacy test runner
- **`reports/`**: Directory for test reports (auto-created)

## Milestone 2 Test Requirements

### 5.1 Periodic Workload (Two Scenarios)

Simulate typical daily traffic patterns with peak and low demand periods **cycling within a single test**.

| Scenario | Peak Users | Low Users | Description |
|----------|------------|-----------|-------------|
| **A** | 100 | 10 | Normal traffic pattern |
| **B** | 1000 | 20 | High traffic pattern |

### 5.2 Once-in-a-Lifetime Workload

Simulate viral traffic spike with **continuous user growth**:
- Start with 10 base users
- Constantly add new users at a given rate
- Determine thresholds:
  - **Without degradation**: p95 < 500ms, error rate < 1%
  - **With degradation**: p95 < 2000ms, error rate < 5%
  - **Failure**: p95 >= 2000ms or error rate >= 5%

---

## Quick Start

### 1. Start Microservices Infrastructure

```bash
# Start all services via docker-compose
docker-compose -f docker-compose.microservices.yml up -d

# Seed databases with test data
npm run seed:microservices

# Verify services are running
docker-compose -f docker-compose.microservices.yml ps
```

### 2. Run Load Tests

#### Option A: PowerShell Script (Recommended for Milestone 2)

```powershell
# Run ALL test scenarios (periodic A + B + lifetime)
.\locust\run_milestone2_tests.ps1 -TestType all

# Run only Periodic Scenario A (100/10 users)
.\locust\run_milestone2_tests.ps1 -TestType periodic-a

# Run only Periodic Scenario B (1000/20 users)
.\locust\run_milestone2_tests.ps1 -TestType periodic-b

# Run Once-in-a-Lifetime with custom growth rate
.\locust\run_milestone2_tests.ps1 -TestType lifetime -GrowthRate 30

# Run against production
.\locust\run_milestone2_tests.ps1 -TargetHost https://cloudappdev.site -TestType all
```

#### Option B: Direct Locust Commands with Shapes

```bash
# Periodic Scenario A (100 peak / 10 low - cycling)
$env:LOCUST_SHAPE="periodic_a"
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 --headless --html=locust/reports/periodic_a.html

# Periodic Scenario B (1000 peak / 20 low - cycling)
$env:LOCUST_SHAPE="periodic_b"
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 --headless --html=locust/reports/periodic_b.html

# Once-in-a-Lifetime (continuous growth)
$env:LOCUST_SHAPE="lifetime"
$env:GROWTH_RATE="20"  # users per minute
$env:MAX_USERS="3000"
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 --headless --html=locust/reports/lifetime.html
```

#### Option C: Interactive Web UI (Manual Control)

```bash
# No shape - use manual --users and --spawn-rate
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000
```

Then open browser: **http://localhost:8089**

---

## Test Scenario Details

### 5.1.1 Periodic Scenario A (100 peak / 10 low)

**Pattern**: Low(10) → Ramp up → Peak(100) → Ramp down → Low(10) → repeat

```
Users
100 ┤     ████████████               ████████████
    │    ╱            ╲             ╱            ╲
 50 ┤   ╱              ╲           ╱              ╲
    │  ╱                ╲         ╱                ╲
 10 ┼══                  ═════════                  ═══
    └─────────────────────────────────────────────────→ Time
    0    3m   5m    8m  10m   12m  14m
        [Cycle 1]           [Cycle 2]
```

- **Duration**: ~14 minutes (2 full cycles)
- **Low phase**: 2 minutes at 10 users
- **Ramp up**: 1 minute to reach 100 users
- **Peak phase**: 3 minutes at 100 users
- **Ramp down**: 1 minute back to 10 users

### 5.1.2 Periodic Scenario B (1000 peak / 20 low)

**Pattern**: Low(20) → Ramp up → Peak(1000) → Ramp down → Low(20) → repeat

```
Users
1000 ┤      ██████████████████             ██████████████████
     │     ╱                  ╲           ╱                  ╲
 500 ┤    ╱                    ╲         ╱                    ╲
     │   ╱                      ╲       ╱                      ╲
  20 ┼═══                        ═══════                        ═══
     └───────────────────────────────────────────────────────────→ Time
     0     4m    6m     13m   15m    19m   21m    28m   30m
          [Cycle 1]                 [Cycle 2]
```

- **Duration**: ~30 minutes (2 full cycles)
- **Low phase**: 4 minutes at 20 users
- **Ramp up**: 2 minutes to reach 1000 users
- **Peak phase**: 7 minutes at 1000 users
- **Ramp down**: 2 minutes back to 20 users

### 5.2 Once-in-a-Lifetime (Continuous Growth)

**Pattern**: Start at 10 users, constantly add users at configurable rate

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

**Formula**: `users = 10 + (growth_rate × minutes_elapsed)`

**Default Configuration**:
- Base users: 10
- Growth rate: 20 users/minute
- Max users: 3000 (safety limit)
- Max duration: 30 minutes

**Variations**:
- `lifetime-slow`: 10 users/min, 40 minutes
- `lifetime-fast`: 50 users/min, 20 minutes

**Threshold Detection**:
| Threshold | p95 Response Time | Error Rate | Status |
|-----------|-------------------|------------|--------|
| Without Degradation | < 500ms | < 1% | ✅ Healthy |
| With Degradation | < 2000ms | < 5% | ⚠️ Degraded |
| Failure | >= 2000ms | >= 5% | ❌ Failed |

---

## User Behavior Simulation

### Traffic Distribution

| User Type | Weight | Behavior |
|-----------|--------|----------|
| Casual Browser | 50% | Quick browsing, searching, viewing (no login) |
| Active User | 30% | Browse, like, comment, create itineraries |
| New User | 20% | Registration, exploration, first itinerary |

### New User Journey (20% weight)
1. Register new account
2. Browse popular itineraries
3. Search for destinations
4. View itinerary details
5. Like interesting itineraries
6. Create first itinerary with locations
7. View and comment on other trips

### Active User Journey (30% weight)
1. Browse feed with filtering
2. Check own itineraries
3. Like multiple itineraries
4. Create detailed itineraries (2-4 locations)
5. View others' itineraries
6. Read and add comments

### Casual Browser Journey (50% weight)
1. Quick browsing (no login)
2. Search for destinations
3. View popular itineraries
4. Maybe register (20% conversion rate)

---

## Running Tests

### PowerShell Examples

```powershell
# All tests (recommended for complete Milestone 2 documentation)
.\locust\run_milestone2_tests.ps1 -TestType all

# Periodic Scenario A only
.\locust\run_milestone2_tests.ps1 -TestType periodic-a

# Periodic Scenario B only
.\locust\run_milestone2_tests.ps1 -TestType periodic-b

# Once-in-a-Lifetime with default growth (20 users/min)
.\locust\run_milestone2_tests.ps1 -TestType lifetime

# Once-in-a-Lifetime with custom growth rate
.\locust\run_milestone2_tests.ps1 -TestType lifetime -GrowthRate 30 -MaxUsers 2000

# Slow growth test (find lower threshold)
.\locust\run_milestone2_tests.ps1 -TestType lifetime-slow

# Fast growth test (stress test)
.\locust\run_milestone2_tests.ps1 -TestType lifetime-fast

# Against production
.\locust\run_milestone2_tests.ps1 -TargetHost https://cloudappdev.site -TestType all
```

### Environment Variable Examples (Bash/Powershell)

```bash
# Periodic A
export LOCUST_SHAPE=periodic_a
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 --headless

# Periodic B
export LOCUST_SHAPE=periodic_b
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 --headless

# Once-in-a-Lifetime with custom settings
export LOCUST_SHAPE=lifetime
export GROWTH_RATE=30
export MAX_USERS=2500
export MAX_DURATION=2400  # 40 minutes
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 --headless
```

---

## Monitoring During Tests

### Kubernetes Metrics

```bash
# Monitor pod resource usage
kubectl top pods

# Monitor node resource usage
kubectl top nodes

# View service logs
kubectl logs -f deployment/cloudappdev-user-service
kubectl logs -f deployment/cloudappdev-itinerary-service
kubectl logs -f deployment/cloudappdev-social-service
kubectl logs -f deployment/cloudappdev-api-gateway
```

### Docker Compose Metrics

```bash
# View container stats
docker stats

# Service logs
docker logs -f cloudappdev_user_service
docker logs -f cloudappdev_itinerary_service
docker logs -f cloudappdev_social_service
docker logs -f cloudappdev_api_gateway
```

### Database Metrics

```bash
# PostgreSQL connections (user service)
docker exec cloudappdev_postgres_users psql -U appuser -d users_db \
    -c "SELECT count(*) FROM pg_stat_activity;"

# PostgreSQL connections (itinerary service)
docker exec cloudappdev_postgres_itineraries psql -U appuser -d itineraries_db \
    -c "SELECT count(*) FROM pg_stat_activity;"

# MongoDB connections
docker exec cloudappdev_mongodb_social mongosh --eval \
    "db.serverStatus().connections"
```

---

## Analyzing Results

### Response Time Analysis

| Rating | p95 Response Time | Interpretation |
|--------|-------------------|----------------|
| Excellent | < 200ms | Optimal performance |
| Good | < 500ms | Acceptable for production |
| Acceptable | < 2000ms | Degraded but functional |
| Poor | > 2000ms | Needs optimization |

### Failure Rate Analysis

| Rating | Error Rate | Interpretation |
|--------|------------|----------------|
| Excellent | < 0.1% | Production ready |
| Good | < 1% | Acceptable |
| Warning | < 5% | Degraded |
| Critical | > 5% | Failure threshold |

### Report Files

Reports are automatically generated in `locust/reports/`:

```
locust/reports/
├── periodic_scenario_a_20251121_143022.html
├── periodic_scenario_a_20251121_143022_stats.csv
├── periodic_scenario_b_20251121_150000.html
├── lifetime_growth_20users_per_min_20251121_153000.html
└── microservices_test_lifetime_20251121_153000.txt
```

---

## Troubleshooting

### Common Issues

**1. Connection refused errors**
```bash
# Check if services are running
docker-compose -f docker-compose.microservices.yml ps

# Check API Gateway health
curl http://localhost:8000/health
```

**2. High failure rates immediately**
```bash
# Verify database connections
docker logs cloudappdev_user_service
docker logs cloudappdev_itinerary_service
docker logs cloudappdev_social_service

# Check if databases are seeded
npm run seed:microservices
```

**3. "No shape" warning**
```bash
# If you want to use shapes, set the environment variable
$env:LOCUST_SHAPE="periodic_a"

# Or use manual mode with --users and --spawn-rate
locust ... --users 100 --spawn-rate 10 --run-time 5m
```

**4. Slow response times on first requests**
```bash
# This is normal - services are warming up
# Run a warmup test first:
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 \
    --users 10 --spawn-rate 2 --run-time 2m --headless
```

---

## Comparing Architectures

### Monolithic vs Microservices

Run tests against both architectures and compare:

```bash
# Monolithic (Milestone 1)
locust -f locust/locustfile.py -TargetHost http://localhost:3000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=locust/reports/monolithic_100users.html

# Microservices (Milestone 2)
$env:LOCUST_SHAPE="periodic_a"
locust -f locust/locustfile_microservices.py -TargetHost http://localhost:8000 \
    --headless --html=locust/reports/microservices_periodic_a.html
```

### Key Comparison Metrics

1. **Response Times**: Which architecture has better p95/p99?
2. **Scalability**: Which handles more concurrent users?
3. **Failure Rates**: Which is more resilient?
4. **Resource Usage**: Which is more efficient?
5. **Bottlenecks**: Where do failures occur in each?

---

## Milestone 2 Checklist

### Performance Testing Requirements

- [ ] Run Periodic Scenario A (100/10 users) - 2 cycles
- [ ] Run Periodic Scenario B (1000/20 users) - 2 cycles
- [ ] Run Once-in-a-Lifetime test with continuous growth
- [ ] Document threshold: workload **without degradation**
- [ ] Document threshold: workload **with degradation**
- [ ] Document threshold: workload **failure point**
- [ ] Collect resource utilization data (kubectl top)
- [ ] Generate HTML reports with charts
- [ ] Compare with Milestone 1 monolithic results
- [ ] Write performance analysis for documentation

### Information to Document

1. **Initial Data**: Seeded dataset from `seed-data/dataset.json`
2. **Transaction Mix**: 50% casual, 30% active, 20% new users
3. **Ramp-up/Ramp-down**: Controlled by load shapes
4. **Metrics**: Response times, failure rates, throughput
5. **Resource Utilization**: CPU, memory per service

---

## Additional Resources

- [Locust Documentation](https://docs.locust.io/)
- [Locust LoadTestShape](https://docs.locust.io/en/stable/custom-load-shape.html)
- [MICROSERVICES.md](../MICROSERVICES.md) - Architecture details
- [CLAUDE.md](../CLAUDE.md) - Complete project documentation
- Milestone 1 results: `paasincresed.html` for comparison
