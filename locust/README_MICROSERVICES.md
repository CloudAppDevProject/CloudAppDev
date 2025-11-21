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

- **`locustfile_microservices.py`**: Main load test file for microservices architecture
- **`locustfile.py`**: Legacy monolithic architecture tests
- **`run_milestone2_tests.ps1`**: PowerShell script to run all Milestone 2 test scenarios
- **`run_scenarios.ps1`**: Legacy test runner
- **`reports/`**: Directory for test reports (auto-created)

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

#### Option A: Interactive Web UI

```bash
# Local testing
locust -f locust/locustfile_microservices.py --host=http://localhost:8000

# Production testing
locust -f locust/locustfile_microservices.py --host=https://cloudappdev.site
```

Then open browser: **http://localhost:8089**

#### Option B: Headless Mode (Automated)

```bash
# Quick test (100 users, 5 minutes)
locust -f locust/locustfile_microservices.py \
    --host=http://localhost:8000 \
    --users 100 \
    --spawn-rate 10 \
    --run-time 5m \
    --headless \
    --html=locust/reports/quick_test.html

# Stress test (1000 users, 10 minutes)
locust -f locust/locustfile_microservices.py \
    --host=http://localhost:8000 \
    --users 1000 \
    --spawn-rate 50 \
    --run-time 10m \
    --headless \
    --html=locust/reports/stress_test.html
```

#### Option C: Automated Milestone 2 Tests

Run all required test scenarios for Milestone 2 documentation:

```powershell
# Run all tests (periodic + once-in-a-lifetime)
.\locust\run_milestone2_tests.ps1 -Host "http://localhost:8000" -TestType all

# Run only periodic workload tests
.\locust\run_milestone2_tests.ps1 -TestType periodic-low
.\locust\run_milestone2_tests.ps1 -TestType periodic-high

# Run only once-in-a-lifetime tests
.\locust\run_milestone2_tests.ps1 -TestType lifetime
```

## Milestone 2 Test Requirements

### 5.1 Periodic Workload

Simulate typical daily traffic patterns with peak and low demand periods.

#### Test Scenarios

**5.1.1 Low Traffic Pattern (100 peak / 10 low)**
```bash
# Peak period: 100 concurrent users
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=locust/reports/periodic_100peak.html

# Low demand: 10 concurrent users
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 10 --spawn-rate 2 --run-time 3m --headless \
    --html=locust/reports/periodic_10low.html
```

**5.1.2 High Traffic Pattern (1000 peak / 20 low)**
```bash
# Peak period: 1000 concurrent users
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 1000 --spawn-rate 50 --run-time 10m --headless \
    --html=locust/reports/periodic_1000peak.html

# Low demand: 20 concurrent users
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 20 --spawn-rate 2 --run-time 3m --headless \
    --html=locust/reports/periodic_20low.html
```

#### Information to Document

1. **Initial Data**: Application seeded with dataset from `seed-data/dataset.json`
   - 10 users with diverse profiles
   - 18 itineraries with locations
   - Comments and likes on various itineraries

2. **Transaction Mix** (by user type):
   - **50% Casual Browsers**: Quick browsing, searching, viewing
   - **30% Active Users**: Browse, like, comment, create itineraries
   - **20% New Users**: Registration, exploration, first itinerary creation

3. **Ramp-up/Ramp-down**:
   - Use `--spawn-rate` parameter to control ramp-up speed
   - Recommended: 10 users/second for 100 users, 50 users/second for 1000 users
   - Test duration: 5-10 minutes per scenario for stable metrics

4. **Metrics to Collect**:
   - Response times (p50, p95, p99)
   - Failure rates (by endpoint)
   - Requests per second
   - Resource utilization: `kubectl top pods`, `kubectl top nodes`

### 5.2 Once-in-a-lifetime Workload

Simulate viral traffic spike (e.g., featured in media) with constant user growth.

#### Test Strategy

Start with base load and incrementally increase users to find breaking points:

```bash
# Base load (10 users)
locust --users 10 --spawn-rate 2 --run-time 2m

# Gradual increases
locust --users 50 --spawn-rate 5 --run-time 5m
locust --users 100 --spawn-rate 5 --run-time 5m
locust --users 250 --spawn-rate 10 --run-time 5m
locust --users 500 --spawn-rate 10 --run-time 10m
locust --users 1000 --spawn-rate 15 --run-time 10m
locust --users 1500 --spawn-rate 20 --run-time 10m
locust --users 2000 --spawn-rate 20 --run-time 10m
```

#### Determine Thresholds

Document when the application:

1. **Survives without degradation**:
   - Response times remain stable (< 500ms p95)
   - Failure rate < 1%
   - Resource utilization < 70%

2. **Survives with degradation**:
   - Response times increase (500ms - 2000ms p95)
   - Failure rate 1-5%
   - Resource utilization 70-90%

3. **No longer survives**:
   - Response times > 2000ms or timeouts
   - Failure rate > 5%
   - Resource utilization > 90% or crashes

#### Information to Document

1. **Initial Data**: Same as periodic workload

2. **Transaction Mix**: Same as periodic workload (50% casual, 30% active, 20% new)

3. **Ramp-up Phase**:
   - Start: 10 users baseline (2 minutes)
   - Growth rate: 5-20 users/second depending on target
   - Total duration: 30+ minutes for full test

4. **Metrics to Collect**:
   - Maximum users without degradation
   - Maximum users with acceptable degradation
   - Failure threshold (max users before crashes)
   - Response time trends as load increases
   - Resource utilization at each threshold

## User Behavior Simulation

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

## Monitoring During Tests

### Application Metrics

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

## Analyzing Results

### Response Time Analysis

- **Excellent**: p95 < 500ms
- **Good**: p95 < 1000ms
- **Acceptable**: p95 < 2000ms
- **Poor**: p95 > 2000ms

### Failure Rate Analysis

- **Excellent**: < 0.1%
- **Good**: < 1%
- **Acceptable**: < 5%
- **Poor**: > 5%

### Throughput Analysis

Calculate requests per second (RPS) per service:
- Target: > 100 RPS total
- Good: > 500 RPS total
- Excellent: > 1000 RPS total

## Report Generation

Reports are automatically generated in `locust/reports/`:

- **HTML reports**: Interactive charts and statistics
- **CSV files**: Raw data for custom analysis
- **Text reports**: Summary statistics

Example files:
```
locust/reports/
├── microservices_test_20251121_143022.html
├── microservices_test_20251121_143022_stats.csv
├── periodic_100users_peak_20251121_143500.html
└── lifetime_1000users_20251121_144000.html
```

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

**3. Slow response times on first requests**
```bash
# This is normal - services are warming up
# Run a warmup test first:
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 10 --spawn-rate 2 --run-time 2m --headless
```

**4. Locust spawning errors**
```bash
# Reduce spawn rate if services can't keep up
# Instead of --spawn-rate 50, try --spawn-rate 10

# Or increase ramp-up time
# Add more time between user spawns
```

## Comparing Architectures

### Monolithic vs Microservices

Run tests against both architectures and compare:

```bash
# Monolithic (Milestone 1)
locust -f locust/locustfile.py --host=http://localhost:3000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=locust/reports/monolithic_100users.html

# Microservices (Milestone 2)
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=locust/reports/microservices_100users.html
```

### Key Comparison Metrics

1. **Response Times**: Which architecture has better p95/p99?
2. **Scalability**: Which handles more concurrent users?
3. **Failure Rates**: Which is more resilient?
4. **Resource Usage**: Which is more efficient?
5. **Bottlenecks**: Where do failures occur in each?

## Next Steps for Milestone 2

1. ✅ Run all periodic workload tests (100 and 1000 users)
2. ✅ Run once-in-a-lifetime tests to find limits
3. ✅ Document thresholds (no degradation, degradation, failure)
4. ✅ Collect resource utilization data
5. ✅ Generate HTML reports with charts
6. ✅ Analyze results and identify bottlenecks
7. ✅ Compare with monolithic architecture (Milestone 1)
8. ✅ Write performance analysis for documentation

## Additional Resources

- [Locust Documentation](https://docs.locust.io/)
- [MICROSERVICES.md](../MICROSERVICES.md) - Architecture details
- [CLAUDE.md](../CLAUDE.md) - Complete project documentation
- Milestone 1 results: `paasincresed.html` for comparison
