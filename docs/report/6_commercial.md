# 6. Commercial Aspects

## 6.1 Tenant Types

The platform implements a B2B SaaS multi-tenancy model with three tiers that differ in functional capabilities, resource thresholds, and isolation levels.

### Tenant Type Overview

| Aspect | Free | Standard | Enterprise |
|--------|------|----------|------------|
| **Namespace** | Shared (`free`) | Shared (`standard`) | Dedicated per tenant |
| **PostgreSQL** | Shared (logical isolation) | Shared (logical isolation) | Dedicated instances |
| **MongoDB** | Shared collections | Shared collections | Dedicated database |
| **Cloud Storage** | Shared bucket | Dedicated bucket | Dedicated bucket |
| **Compute Pods** | Shared replicas | Shared with priority | Dedicated pods (2-20) |
| **Domain** | {name}.cloudappdev.site | {name}.cloudappdev.site | Custom or {name}.cloudappdev.site |

### Functional Capabilities

**Free Tier:**
- Max 3 itineraries, 5 users, 100 comments
- 500MB storage, 10K API requests/day
- No newsletter, best-effort availability
- Community support only

**Standard Tier:**
- 50 itineraries, 20 users, unlimited comments
- 2GB storage, 300K API requests/month
- Newsletter enabled
- Email support, 99.5% SLA, daily backups
- Limited customization

**Enterprise Tier:**
- Unlimited itineraries and users
- 100GB storage, 1M API requests/month
- Unlimited newsletter recipients
- Dedicated support, 99.9% SLA
- Full customization

### Thresholds

**Compute Resources:**
- Free: CPU 50-200m, Memory 128-256Mi
- Standard: CPU 100-500m, Memory 256-512Mi
- Enterprise: CPU 500-2000m, Memory 1-2Gi

**API Rate Limits:**
- Free: 100 req/min burst, 10K/day (hard limit)
- Standard: 300K/month included
- Enterprise: 1M/month included

**Storage Caps:**
- Free: 500MB (hard limit)
- Standard: 2GB included
- Enterprise: 100GB included

### Isolation

**Data Isolation:**
- Free/Standard: Logical isolation via `tenant_id` column in shared databases
- Enterprise: Physical isolation with dedicated PostgreSQL instances and MongoDB databases

**Network Isolation:**
- Free/Standard: No network isolation (shared namespace)
- Enterprise: Kubernetes NetworkPolicies restrict cross-namespace traffic, dedicated endpoints

**Resource Isolation:**
- Free/Standard: Shared compute resources with quotas
- Enterprise: Dedicated CPU/memory limits per namespace, isolated Cloud SQL instances

### Provisioning

Tenants are provisioned via Infrastructure-Provisioner Service:
- Free/Standard: Automatic provisioning (sub-minute)
- Enterprise: Terraform-based provisioning (5-10 minutes), dedicated namespace deployment

## 6.2 Pricing Model

### Free Tier - €0.00/month

**Target Market**: Hobbyists, personal projects, product evaluation

**Included Resources**:
- Custom subdomain (e.g., `mytravel.dev.cloudappdev.site`)
- 3 travel itineraries (routes)
- 5 user accounts per tenant
- 500MB image storage
- 10,000 API requests/day (300K/month)
- 100 comments, unlimited likes
- Community support (documentation only)
- Weekly backups, 90-day data retention
- No SLA (best-effort availability)

**Compute Resources**: Shared pool (CPU: 50m-200m, Memory: 128-256Mi)

**Rationale**: Serves as product demo and viral marketing channel. Minimal marginal cost (~€0.72/tenant/month) enables large user base for conversion funnel. Target 5-10% conversion to paid tiers.

**Quota Enforcement**: Hard limits at application layer. When exceeded, users see upgrade prompts with blocked functionality (HTTP 402 for storage, HTTP 429 for API rate limits).

---

### Standard Tier - €19.99/month (Base Fee)

**Target Market**: Power users, frequent travelers, small teams

**Pricing Structure**: Hybrid (Fixed base + usage-based overages)

**Base Fee (€19.99/month) Includes**:
- 50 routes (itineraries)
- 20 user accounts
- 2GB image storage
- 300,000 API requests/month
- Newsletter functionality (SendGrid integration)
- Priority email support (24-48h response)
- Daily backups, 2-year retention
- 99.5% uptime SLA

**Usage-Based Pricing (Beyond Base Quotas)**:

| Resource | Overage Pricing | Monthly Cap | Calculation |
|----------|----------------|-------------|-------------|
| **Storage** | €0.05 per GB | €10.00 (at 202GB) | Daily average × €0.05/GB |
| **API Requests** | €0.10 per 1,000 requests | €50.00 | (Total - 300K) × €0.0001 |
| **Newsletter** | €0.01 per recipient | €10.00 (1,000 recipients) | Recipients × €0.01 |

**Total Monthly Range**: €19.99 - €89.99 (with all caps applied)

**Compute Resources**: CPU 100-500m, Memory 256-512Mi, 1-5 autoscaling replicas

**Rationale**: Base fee of €19.99 covers infrastructure costs with 25-28% margin on typical usage. Usage-based pricing aligns costs with customer value and prevents abuse. Caps protect customers from bill shock while maintaining profitability.

**Metering**: Real-time via Google Cloud Monitoring (storage: daily snapshots, API requests: counter per request, newsletter: SendGrid webhooks)

---

### Enterprise Tier - From €249.00/month

**Target Market**: Travel agencies, tour operators, corporate teams, white-label partners

**Pricing Structure**: Custom quote based on requirements

**Base Configuration (€249/month)**:
- Dedicated Kubernetes namespace
- Dedicated PostgreSQL databases (2 instances)
- Dedicated Firestore database
- Dedicated Cloud Storage bucket
- 100GB storage included
- 1,000,000 API requests/month included
- Unlimited routes and users
- Custom subdomain or BYOD (Bring Your Own Domain)
- 99.9% uptime SLA
- Dedicated support (4-hour response)
- Daily backups + point-in-time recovery

**Add-On Pricing**:
- Additional storage: €0.03 per GB/month (bulk discount vs Standard)
- Additional compute node: €50/month
- Dedicated node pool: €150/month
- White-label branding: €1,000 one-time setup
- Multi-region deployment: €200/month per region
- Professional services: €150/hour

**Typical Configurations**:
- Small (€249-350/month): 50-100 users, 100GB storage, 1M API requests
- Medium (€350-600/month): 100-500 users, 250GB storage, 5M requests, custom integrations
- Large (€600-1,500/month): 500+ users, 1TB storage, 20M+ requests, multi-region, dedicated support

**Compute Resources**: CPU 500m-2000m, Memory 1-2Gi per service, 2-20 autoscaling replicas

**Contract Terms**: 6-month minimum commitment, €500 setup fee (waived for annual contracts)

**Rationale**: Value-based pricing reflecting dedicated infrastructure and premium features. Base pricing at €249 achieves 22% margin with optimized configuration. Typical customers at €399-699/month reach 30-40% margins. Custom pricing enables negotiation for large contracts while protecting profitability.

---

### Pricing Parameter Definitions

#### Storage Calculation
```
Monthly Storage Cost = Base Fee + (Total GB - Included GB) × Price per GB

Free Tier:     Hard cap at 500MB (no overage allowed)
Standard Tier: (Total GB - 2GB) × €0.05/GB (if Total GB > 2GB)
Enterprise Tier: (Total GB - 100GB) × €0.03/GB (if Total GB > 100GB)
```

**Measurement**: Monthly average from daily snapshots. Includes all Cloud Storage images. Deleted files removed within 24 hours. No versioning.

#### API Request Calculation
```
Monthly API Cost = (Total Requests - Included Requests) × Price per Request

Free Tier:     Hard cap at 300K/month (rate limited at 10,000/day)
Standard Tier: (Total - 300K) × €0.0001/request (if Total > 300K)
Enterprise Tier: (Total - 1M) × €0.00005/request (if Total > 1M)
```

**What Counts as API Request**:
- ✅ All backend HTTP requests (GET, POST, PUT, DELETE)
- ✅ Frontend API calls (itineraries, comments, likes, user profiles)
- ✅ Image uploads/downloads
- ✅ Authentication requests
- ❌ Static asset serving (CDN cached)
- ❌ Health checks
- ❌ Internal service-to-service calls

**Metering**: Counted at NGINX API Gateway, logged to Cloud Monitoring, aggregated per tenant ID.

---

### Tier Comparison Summary

| Feature | Free | Standard | Enterprise |
|---------|------|----------|------------|
| **Price** | €0 | €19.99/mo | €249+/mo |
| **Routes** | 3 | 50 | Unlimited |
| **Users** | 5 | 20 | Unlimited |
| **Storage** | 500MB | 2GB + overages | 100GB + overages |
| **API Requests** | 300K/mo | 300K/mo + overages | 1M/mo + overages |
| **Newsletter** | Disabled | €0.01/recipient | Unlimited |
| **CPU** | 50-200m | 100-500m | 500-2000m |
| **Memory** | 128-256Mi | 256-512Mi | 1-2Gi |
| **Replicas** | 1 (shared) | 1-5 | 2-20 |
| **SLA** | None | 99.5% | 99.9% |
| **Support** | Community | Email (24-48h) | Dedicated (4h) |
| **Backups** | Weekly | Daily | Daily + PITR |

---

## 6.3 Cost Model

### Shared Infrastructure Costs (Monthly)

These fixed costs serve all tenants regardless of tier:

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| **GKE Cluster** | €170.31 | Control plane (€72) + 3 nodes (€72.81) + disks (€25.50) |
| **Networking** | €35.06 | Load balancer (€18.26) + SSL (free) + egress (€16.80) |
| **Shared Services** | €15.75 | Tenant service (€3.50) + Travel info (€3.50) + Provisioning (€8.75) |
| **Monitoring & Logging** | €18.10 | Cloud Monitoring (€12.90) + Logging (€5.00) + Errors (€0.20) |
| **Shared Databases** | €17.84 | PostgreSQL users (€7.67) + itinerary (€7.67) + backups (€2.50) |
| **Total** | **€257.06** | Allocated across all paying customers |

**Allocation Strategy**: Shared costs divided equally among Standard and Enterprise tenants. Free tier excluded from allocation to minimize friction.

---

### Per-Tenant Costs by Tier

#### Free Tier - €0.72/tenant/month

**Marginal Cost Breakdown**:
- Compute (shared pool): €0.50/month (50m CPU, 128Mi memory amortized)
- Storage (500MB max): €0.063/month (€0.013 Cloud Storage + €0.05 database)
- Bandwidth (~0.5GB): €0.06/month
- Monitoring: €0.10/month

**Rationale**: Near-zero marginal cost enables large user base. Main cost is opportunity cost of shared resources. Break-even requires 4% conversion rate to Standard tier.

**Scenarios**:
- **Best Case** (100 tenants): €72/month cost, 10% conversion = 10 Standard = €199.90 revenue → ✅ Profitable
- **Average Case** (500 tenants): €360/month cost, 5% conversion = 25 Standard = €499.75 revenue → ✅ Profitable  
- **Worst Case** (1,000 tenants): €720/month cost, 2% conversion = 20 Standard = €399.80 revenue → ❌ Loss (€320/month)

**Risk Mitigation**: Monitor conversion rates closely. If <4%, tighten quotas or implement time-based limits (e.g., 90-day trial).

---

#### Standard Tier - €30.15/tenant/month total cost

**Direct Cost Breakdown**:
- Compute (shared replicas): €18.00/month (5 services × dedicated resources during peaks)
- Storage (2GB base): €0.052/month
- Database (shared): €1.53/month (10% allocation of shared PostgreSQL)
- Bandwidth (~5GB): €0.60/month
- Monitoring: €3.08/month (logs + custom metrics)
- Support (email): €2.00/month (amortized)
- **Direct Subtotal**: €25.21/month

**Allocated Infrastructure**: €4.94/month (assuming 50 Standard + 2 Enterprise tenants share €257.06)

**Total Cost**: €30.15/month

**Revenue Analysis**:
- Base fee only: €19.99/month → **❌ Loss of €10.16/month**
- With avg overages (€7/mo): €26.99/month → **❌ Loss of €3.16/month**
- With typical usage (€17/mo overage): €36.99/month → **✅ Profit €6.84/month (23% margin)**
- With high usage (€55/mo overage): €74.99/month → **✅ Profit €44.84/month (60% margin)**

**Scenarios**:

| Scenario | Revenue | Cost | Margin | Likelihood |
|----------|---------|------|--------|------------|
| **Worst** (no overage) | €19.99 | €30.15 | -€10.16 (-34%) | 15% of users |
| **Average** (moderate usage) | €36.99 | €30.15 | €6.84 (23%) | 60% of users |
| **Best** (high usage) | €74.99 | €30.15 | €44.84 (60%) | 25% of users |

**Weighted Average**: (0.15 × -€10.16) + (0.60 × €6.84) + (0.25 × €44.84) = **€13.94/month profit (38% margin)**

**Rationale**: Base price of €19.99 deliberately set below full cost recovery to maintain competitive positioning and psychological pricing (sub-€20). Profitability depends on usage-based revenue, which aligns incentives: higher usage = more customer value = more revenue. Average customer achieves 23% margin.

**Break-Even**: Requires €10.16 in monthly overages (achievable with typical usage patterns: 5GB storage overage + 100K extra API calls + 200 newsletter recipients = €0.25 + €10 + €2 = €12.25).

---

#### Enterprise Tier - €384.66/tenant/month (ongoing)

**Direct Cost Breakdown**:
- Compute (dedicated): €202.50/month (2 replicas per service × 5 services)
  - Frontend: 2 × (500m CPU, 1Gi memory) = €45
  - User Service: 2 × (500m CPU, 1Gi memory) = €45
  - Itinerary Service: 2 × (500m CPU, 1Gi memory) = €45
  - Social Service: 2 × (500m CPU, 1Gi memory) = €45
  - API Gateway: 2 × (250m CPU, 512Mi memory) = €22.50
- Databases (dedicated): €105.66/month
  - Users DB: db-n1-standard-1 = €45.33
  - Itinerary DB: db-n1-standard-1 = €45.33
  - Firestore: Dedicated database = €10.00
  - Backups: 7-day retention = €5.00
- Storage (100GB): €2.60/month
- Networking (~50GB egress): €6.00/month
- Monitoring (dedicated): €17.90/month (logs + dashboards)
- Support (dedicated): €50.00/month (fractional CSM allocation)
- **Total Ongoing**: €384.66/month

**First-Year Cost**: €426.33/month (includes €41.67/month amortized provisioning setup fee)

**Revenue Analysis at Base Pricing (€249/month)**:
- Base fee: €249/month
- Typical add-ons: €50/month (storage overages, custom features)
- **Total Revenue**: €299/month
- **Margin**: €299 - €384.66 = **❌ Loss of €85.66/month (-22%)**

**Break-Even Price**: €384.66/month  
**Target Price for 30% Margin**: €384.66 / 0.70 = **€549.51/month**

**Scenarios**:

| Configuration | Monthly Cost | Revenue | Margin | Recommendation |
|---------------|--------------|---------|--------|----------------|
| **Optimized** (1 replica, db-f1-micro) | €245.33 | €249 base | €3.67 (1.5%) | Minimum viable |
| **Standard** (2 replicas, db-n1-standard-1) | €384.66 | €399 adjusted | €14.34 (3.7%) | Requires price increase |
| **Premium** (2 replicas + add-ons) | €384.66 | €549 target | €164.34 (30%) | Ideal target |
| **High-Scale** (10 replicas, peak usage) | €1,192.50 | €249 base | -€943.50 (-79%) | ⚠️ Risk scenario |

**Rationale**: 
- Base price of €249 is **strategically underpriced** to compete with market and secure enterprise deals
- Requires either: (1) infrastructure optimization (smaller databases, fewer replicas) OR (2) price adjustment to €399-549
- High-scale risk mitigated through resource quotas and autoscaling limits configured per contract
- Profitability achieved through add-ons (white-label, multi-region, professional services)

**Recommended Strategy**:
1. Set base configuration as **optimized** (1 replica, db-f1-micro) at €249 → 1.5% margin
2. Offer **standard configuration** (2 replicas, db-n1-standard-1) at €399 → 3.7% margin  
3. Upsell **premium features** (multi-region, white-label) to reach €549+ → 30% margin
4. Reserve **high-scale configurations** for custom quotes only (€800-1,500/month range)

---

### Aggregate Cost Scenarios

#### Scenario 1: Early Stage (0-6 months)

**Customer Mix**:
- 500 Free tenants
- 20 Standard tenants  
- 1 Enterprise tenant

**Monthly Costs**:
- Shared infrastructure: €257.06
- Free tier: 500 × €0.72 = €360.00
- Standard tier: 20 × €30.15 = €603.00
- Enterprise tier: 1 × €426.33 = €426.33
- **Total**: €1,646.39/month

**Monthly Revenue**:
- Free: €0
- Standard: 20 × €36.99 (with avg overages) = €739.80
- Enterprise: 1 × €299 = €299.00
- **Total**: €1,038.80/month

**Result**: **❌ Loss of €607.59/month (-37% margin)**

**Break-Even Requirements**: Need 3 more Enterprise tenants OR 35 more Standard tenants (with average overages)

---

#### Scenario 2: Growth Stage (6-18 months)

**Customer Mix**:
- 200 Free tenants (reduced through conversion)
- 50 Standard tenants
- 5 Enterprise tenants

**Monthly Costs**:
- Shared infrastructure: €257.06
- Free tier: 200 × €0.72 = €144.00
- Standard tier: 50 × €30.15 = €1,507.50
- Enterprise tier: 5 × €384.66 = €1,923.30
- **Total**: €3,831.86/month

**Monthly Revenue**:
- Free: €0
- Standard: 50 × €36.99 = €1,849.50
- Enterprise: 5 × €399 (adjusted pricing) = €1,995.00
- **Total**: €3,844.50/month

**Result**: **✅ Profit of €12.64/month (0.3% margin)**

**Break-Even Achieved**: Minimal profitability at scale with adjusted pricing

---

#### Scenario 3: Mature Stage (18+ months)

**Customer Mix**:
- 100 Free tenants (low activity, mostly dormant)
- 30 Standard tenants (power users with high overages)
- 10 Enterprise tenants (optimized configurations + add-ons)

**Monthly Costs**:
- Shared infrastructure: €257.06
- Free tier: 100 × €0.50 = €50.00 (low activity reduces costs)
- Standard tier: 30 × €30.15 = €904.50
- Enterprise tier: 10 × €245.33 = €2,453.30 (optimized infrastructure)
- **Total**: €3,664.86/month

**Monthly Revenue**:
- Free: €0
- Standard: 30 × €55.00 (high usage) = €1,650.00
- Enterprise: 10 × €449 (base + add-ons) = €4,490.00
- **Total**: €6,140.00/month

**Result**: **✅ Profit of €2,475.14/month (40% margin)**

**Target Achieved**: Healthy profitability with balanced customer mix and optimized infrastructure

---

### Cost Optimization Opportunities

#### Infrastructure Optimization (Potential Savings: €600-800/month)
1. **GKE Autopilot**: 15% reduction in compute costs through better bin-packing
2. **Preemptible VMs**: 60% savings on non-critical workloads (monitoring, batch jobs)
3. **Committed Use Discounts**: 37% savings on databases with 3-year commitment
4. **Regional Consolidation**: 20% reduction in networking costs (single region vs multi-region)

#### Operational Efficiency (Potential Savings: €200-400/month)
1. **Multi-Tenancy Density**: Increase free/standard tenants per node from 10 to 20
2. **Vertical Pod Autoscaling**: Right-size resources dynamically (reduce overprovisioning by 25%)
3. **Database Connection Pooling**: Reduce database instance count by 50%

#### Strategic Pricing Adjustments (Revenue Increase: €1,500-2,000/month at 50 customers)
1. **Standard Tier**: Current pricing optimal (€19.99 base achieves target margin with overages)
2. **Enterprise Tier**: Adjust base pricing to €399-549 range (30% margin target)
3. **Free Tier**: Implement time-based limits (90-day trial) or tighter quotas to drive conversion

---

### Summary & Recommendations

**Current State**: Platform operates at a loss in early stage due to customer acquisition costs and infrastructure overhead.

**Path to Profitability**:
1. **Immediate**: Adjust Enterprise pricing to €399 minimum (achieves break-even)
2. **Short-term** (3 months): Optimize infrastructure (target €600/month savings)
3. **Medium-term** (6 months): Reach 30 Standard + 5 Enterprise customers (break-even point)
4. **Long-term** (12 months): Target 30 Standard + 10 Enterprise customers (40% margin, €2,500/month profit)

**Profitability Milestones**:
- **Break-Even**: 15 Enterprise tenants @ €399 OR 100 Standard tenants @ €37/month (with overages)
- **Target Margin (30%)**: 10 Enterprise @ €549 + 30 Standard @ €55/month
- **Optimal Mix**: 60% revenue from Enterprise (predictable), 40% from Standard (volume)