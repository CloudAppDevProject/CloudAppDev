# 🚀 Load Testing - CloudAppDev

Comprehensive load testing suite with realistic user journeys and enhanced interactive reports.

## 🎯 Features

- ✅ **3 User Journeys** (New User, Active User, Casual Browser)
- ✅ **2 Workload Scenarios** (Periodic & Once-in-a-Lifetime)
- ✅ **Enhanced HTML Reports** with interactive charts & performance scores
- ✅ **Optimized Performance** (6ms avg response, 0.01% failure rate)
- ✅ **100+ concurrent users** tested successfully

## ⚡ Quick Start

### 1. Install Dependencies
```bash
pip install -r locust/requirements.txt
```

### 2. Start Your App
```bash
npm run dev
# App must be running on http://localhost:3000
```

### 3. Run Load Test

**Windows:**
```powershell
.\locust\run_scenarios.ps1 -Workload periodic
```

**Linux/Mac:**
```bash
./locust/run_scenarios.sh --workload periodic
```

## 📈 Test Reports

Reports are saved to `locust/reports/`:
- **HTML Reports**: Interactive dashboards with charts
- **CSV Files**: Raw data for custom analysis

Open the HTML files in your browser for detailed performance insights.

---

## 🌐 Cloud Testing

**⚠️ Local tests only validate application logic, NOT production performance!**

For realistic production validation, test against Cloud Run with low-tier resources:

```powershell
# Phase 2: Find breaking point of db-f1-micro (250 users)
.\locust\run_cloud_tests.ps1 -Phase phase2-breaking-point -CloudUrl https://your-app.run.app -Tier db-f1-micro

# Phase 3: Sustained load with db-g1-small (500 users, 1 hour)
.\locust\run_cloud_tests.ps1 -Phase phase3-sustained -CloudUrl https://your-app.run.app -Tier db-g1-small

# Phase 4: Peak traffic (2,000 users, 30 min)
.\locust\run_cloud_tests.ps1 -Phase phase4-peak -CloudUrl https://your-app.run.app -Tier db-g1-small
```

**Read the full strategy:** [LOAD_TEST_STRATEGY.md](./LOAD_TEST_STRATEGY.md)

### Why Cloud Testing Matters:
- **Network latency**: 50-200ms vs. <1ms local
- **Database performance**: 10-20x slower on db-f1-micro
- **Auto-scaling**: Cold starts, load balancing not tested locally
- **Real bottlenecks**: Only visible under cloud infrastructure constraints

**Bottom Line**: 500 local users ≠ 500 cloud users. Cloud testing is essential.

---

## 🎯 Available Tests

### Periodic Workload (Recommended)
Normal daily usage with 100 users for 10 minutes.
- Tests all endpoints
- Realistic user behavior mix
- Creates itineraries, likes, comments

### Once-in-a-Lifetime Workload
Simulates extreme viral traffic spike (1,000 users, 3 min).
- 1,000 concurrent users
- Extreme spawn rate (200 users/sec)
- Stress test for viral events
- Short duration (3 min) - maximum intensity

### Custom Test
```bash
cd locust
locust -f locustfile.py --headless -u 200 -r 20 -t 20m --host=http://localhost:3000 --html=reports/custom.html
```

## 📊 Enhanced Reports

Every test generates two types of reports in `locust/reports/`:

### 1. Standard Locust HTML Report
Basic stats, charts, and tables.

### 2. Enhanced Report (NEW! 🎨)
**File:** `*_enhanced.html`

**Features:**
- 🎯 **Performance Score** (A-F grade)
- 📊 **Interactive Plotly Charts:**
  - Response time over time
  - Throughput (RPS)
  - Slowest endpoints
  - Request distribution
  - Failure rate analysis
- 📈 **Beautiful Bootstrap UI**

**Generate manually:**
```bash
python locust/generate_enhanced_report.py locust/reports/<test_name>
```

