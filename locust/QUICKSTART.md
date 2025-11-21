# Locust Load Testing - Quick Start Guide

## TL;DR - Run Tests Now

```bash
# 1. Verify services are running
docker-compose -f docker-compose.microservices.yml ps

# 2. Test API Gateway health
curl http://localhost:8000/health

# 3. Start Locust web UI
locust -f locust/locustfile_microservices.py --host=http://localhost:8000

# 4. Open browser: http://localhost:8089
#    - Set users: 100
#    - Set spawn rate: 10
#    - Click "Start swarming"
```

## For Milestone 2 Automated Tests

```powershell
# Run all required test scenarios
.\locust\run_milestone2_tests.ps1 -TargetHost "http://localhost:8000" -TestType all
```

## What's Different from Milestone 1?

### Old (Monolithic):
```
http://localhost:3000/api/user
http://localhost:3000/api/itineraries
http://localhost:3000/api/likes
http://localhost:3000/api/comments
```

### New (Microservices):
```
http://localhost:8000/api/v1/users          ← User Service
http://localhost:8000/api/v1/itineraries   ← Itinerary Service
http://localhost:8000/api/v1/social/likes/toggle  ← Social Service
http://localhost:8000/api/v1/social/comments      ← Social Service
```

**Key Changes:**
- All traffic goes through **API Gateway** (port 8000)
- New URL structure: `/api/v1/...`
- Different API patterns (RESTful with NestJS controllers)
- Social features in separate service

## Quick Health Check

```bash
# Test all services at once
python locust/test_microservices.py

# Expected output:
# ✓ Health Check: 200
# ✓ List Users: 200
# ✓ List Itineraries: 200
# ✓ Get Comments: 200
# ✓ Get Likes: 200
```

## Common Commands

### Interactive Testing (Web UI)

```bash
# Start Locust web interface
locust -f locust/locustfile_microservices.py --host=http://localhost:8000

# Open browser: http://localhost:8089
# Configure:
#   - Number of users: 100
#   - Spawn rate: 10 users/second
#   - Host: http://localhost:8000
# Click "Start swarming"
```

### Headless Testing (Automated)

```bash
# Quick 5-minute test with 100 users
locust -f locust/locustfile_microservices.py \
    --host=http://localhost:8000 \
    --users 100 \
    --spawn-rate 10 \
    --run-time 5m \
    --headless \
    --html=locust/reports/quick_test.html

# Stress test with 1000 users
locust -f locust/locustfile_microservices.py \
    --host=http://localhost:8000 \
    --users 1000 \
    --spawn-rate 50 \
    --run-time 10m \
    --headless \
    --html=locust/reports/stress_test.html
```

### Milestone 2 Test Scenarios

```powershell
# Periodic workload - 100 peak / 10 low
.\locust\run_milestone2_tests.ps1 -TestType periodic-low

# Periodic workload - 1000 peak / 20 low
.\locust\run_milestone2_tests.ps1 -TestType periodic-high

# Once-in-a-lifetime - constant growth
.\locust\run_milestone2_tests.ps1 -TestType lifetime

# All tests (takes 60+ minutes!)
.\locust\run_milestone2_tests.ps1 -TestType all
```

## Troubleshooting

### "Connection refused" errors

```bash
# Check if services are running
docker-compose -f docker-compose.microservices.yml ps

# Restart if needed
docker-compose -f docker-compose.microservices.yml restart

# Check gateway health
curl http://localhost:8000/health
```

### No itineraries found

```bash
# Seed the databases
npm run seed:microservices

# Verify data exists
curl http://localhost:8000/api/v1/itineraries
```

### High failure rates immediately

```bash
# Check service logs
docker logs cloudappdev_user_service
docker logs cloudappdev_itinerary_service
docker logs cloudappdev_social_service
docker logs cloudappdev_api_gateway

# Common issues:
# - Database not migrated: docker logs shows Prisma errors
# - Firebase credentials missing: check .env files
# - Services not fully started: wait 30s after docker-compose up
```

### Slow first requests

This is normal! Services need to warm up:
- Database connections establish on first request
- Prisma client generates on first query
- Node.js JIT compiles hot paths

Run a warmup test first:
```bash
locust -f locust/locustfile_microservices.py \
    --host=http://localhost:8000 \
    --users 10 \
    --spawn-rate 2 \
    --run-time 2m \
    --headless
```

## Monitoring During Tests

### Application Metrics

```bash
# View all logs
docker-compose -f docker-compose.microservices.yml logs -f

# View specific service
docker logs -f cloudappdev_user_service
docker logs -f cloudappdev_itinerary_service
docker logs -f cloudappdev_social_service
docker logs -f cloudappdev_api_gateway
```

### Resource Usage

```bash
# Docker stats (CPU, Memory)
docker stats

# Kubernetes (if deployed)
kubectl top pods
kubectl top nodes
```

### Database Connections

```bash
# PostgreSQL (User Service)
docker exec cloudappdev_postgres_users psql -U appuser -d users_db \
    -c "SELECT count(*) FROM pg_stat_activity;"

# PostgreSQL (Itinerary Service)
docker exec cloudappdev_postgres_itineraries psql -U appuser -d itineraries_db \
    -c "SELECT count(*) FROM pg_stat_activity;"

# MongoDB (Social Service)
docker exec cloudappdev_mongodb_social mongosh --eval \
    "db.serverStatus().connections"
```

## Reading Results

### Response Time Guidelines

- **Excellent**: p95 < 500ms
- **Good**: p95 < 1000ms
- **Acceptable**: p95 < 2000ms
- **Poor**: p95 > 2000ms

### Failure Rate Guidelines

- **Excellent**: < 0.1%
- **Good**: < 1%
- **Acceptable**: < 5%
- **Poor**: > 5%

### Throughput Guidelines

- **Target**: > 100 RPS
- **Good**: > 500 RPS
- **Excellent**: > 1000 RPS

## Next Steps

1. ✅ Run quick test to verify setup
2. ✅ Run periodic workload tests (100 and 1000 users)
3. ✅ Run once-in-a-lifetime tests to find limits
4. ✅ Document thresholds in performance report
5. ✅ Compare with Milestone 1 monolithic results

## Files Generated

After running tests, check:
```
locust/reports/
├── microservices_test_20251121_143022.html      ← Full test report
├── microservices_test_20251121_143022_stats.csv ← Raw statistics
├── periodic_100users_peak_20251121_143500.html  ← Periodic tests
└── lifetime_1000users_20251121_144000.html      ← Stress tests
```

## Need More Help?

- Full documentation: `locust/README_MICROSERVICES.md`
- Architecture details: `MICROSERVICES.md`
- Complete guide: `CLAUDE.md`
- Original tests: `locust/locustfile.py` (monolithic)

---

**Ready?** Run: `locust -f locust/locustfile_microservices.py --host=http://localhost:8000`
