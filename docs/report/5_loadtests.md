## 5. Performance Testing

### 5.1 Test Approach and Modifications

The standardized test guideline (Periodic + Once-in-a-Lifetime Workload) was adapted for this phase: Instead of maximizing individual load scenarios, a **unified, moderate load across three infrastructure setups** was compared. This optimizes costs (Firebase quotas, DB operations) and focuses on practical infrastructure assessment.

**Unified Test Profile**: 
- Ramp: 10 users (warmup) → 1000 users over 5 minutes → 2 minutes at peak
- Total duration: 7 minutes
- Spawn rate: ~3 users/sec (200/min, below Firebase 400/min limit)
- Framework: Locust (Python), Target: https://iii.dev.cloudappdev.site


---

## 5.2 Test Setup: Architecture and Transaction Mix

**Microservice Stack**: Next.js Frontend → Nginx Gateway → User/Itinerary/Social/Travel-Info Microservices → MongoDB/PostgresDBs

**Transaction Mix** (identical across all 3 tests):
- Search Itineraries (40%, Weight 3): Primary activity
- View Itinerary (26%, Weight 2): Display details
- Create Itinerary (26%, Weight 2): Create new travel plans
- Comments & Likes (8%, Weight 1 each): Social features

**User Initialization**: Dynamic registration with Firebase Auth (max ~400 reg/min rate-limit), then login, then transactions weighted by task distribution.

**Initialization Data**: Minimal (max. 50-100 predefined itineraries); test creates new users/comments at runtime.

---

## 5.3 Test Results and Infrastructure Comparison

### Metrics Summary

**Free-Tier Results** (from Locust test):
- Failures begin around ~300  users
- High failure ratio: 15496 failures / 11496 requests
- Mechanism: Resource exhaustion or rate limiting at low concurrency

![Free-Tier Test Results](../test_results/free.png)

**Standard-Tier Results** (from Locust test):
- Stable and error-free up to ~600  users
- Errors begin increasing after 600 users
- High error ratio only reached after 1000+ users at sustained load

![Standard-Tier Test Results](../test_results/standard.png)

**Enterprise-Tier Results** (from Locust test):
- No failures observed across entire test duration
- Response times increase under load but no error conditions
- Continues accepting and processing all requests

![Enterprise-Tier Test Results](../test_results/enterprise.png)

---

## 5.4 Bottleneck Analysis

### Test Results by Tier:

**Free-Tier Failure Pattern** (Locust data):
- Fails early at ~300 concurrent users with systematic high failure rate
- Hard limit: Once concurrency exceeds capacity, majority of requests fail
- Likely bottleneck: Resource exhaustion (connection pool, memory, or request queue)

**Standard-Tier Degradation Pattern** (Locust data):
- Remains stable up to ~600 concurrent users
- Failures emerge gradually between 600-1000 users
- High error ratio only after sustained load at 1000+ users
- Soft limit: System degrades gracefully rather than catastrophic failure
- visible dips where ressources are horizontally balanced

**Enterprise-Tier Stability Pattern** (Locust data):
- Zero failures across entire test duration (up to 1000+ concurrent users)
- No hard limit encountered in test scope
- Performance impact: Increased response times only, no error conditions

---

## 5.5 Summary

### Key Findings from Test Data:

1. **Free-Tier**: Hard limit at ~300 concurrent users - majority of requests fail beyond this point
2. **Standard-Tier**: Soft limit around 600-1000 concurrent users - gradual error increase until defined limit of ressources is reached, not catastrophic
3. **Enterprise-Tier**: No observable limit within test scope - stable with graceful performance degradation

### What This Means:

- **Scaling behavior differs by tier**: Free fails suddenly, Standard fails gradually, Enterprise doesn't fail
- **Failure mode differences suggest different bottleneck types**: 
  - Free-Tier likely hits connection/resource pool hard limit
  - Standard-Tier hits soft resource limit allowing gradual degradation
  - Enterprise-Tier has sufficient resources for test scope
- **Infrastructure investment provides linear scaling improvement**: Each tier handles roughly 2-3x more users before failures
