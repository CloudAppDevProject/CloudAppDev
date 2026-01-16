# Multi-Tenancy Infrastructure Setup Guide

This guide explains how to set up and use the automated multi-tenant infrastructure provisioning system.

## Overview

The system automatically provisions infrastructure when the tenant service registers a new tenant:

- **All Tenants**: Get subdomain `{tenant-name}.cloudappdev.site` with SSL
- **Enterprise Tenants**: Additionally get dedicated Kubernetes namespace with full stack

## Architecture Components

```
┌─────────────────────┐
│  Tenant Service     │ Creates tenant in DB
│  (NestJS)           │
└──────────┬──────────┘
           │ HTTP POST
           ▼
┌─────────────────────────────────┐
│  Infrastructure Provisioner     │
│  (Node.js API)                  │
└──────────┬──────────────────────┘
           │
           ├──► Updates tenants.tfvars
           ├──► Runs terraform apply
           │    ├─► Creates subdomain + SSL cert (all)
           │    └─► Creates namespace + databases (enterprise)
           └──► Deploys K8s resources (enterprise)
                ├─► API Gateway
                ├─► Frontend
                ├─► User Service
                ├─► Itinerary Service
                └─► Social Service
```

## Prerequisites

### 1. GCP Service Account

Create service account with required permissions:

```bash
# Create service account
gcloud iam service-accounts create infrastructure-provisioner-sa \
  --display-name="Infrastructure Provisioner Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding cloudappdev-dev \
  --member="serviceAccount:infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com" \
  --role="roles/certificatemanager.editor"

gcloud projects add-iam-policy-binding cloudappdev-dev \
  --member="serviceAccount:infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding cloudappdev-dev \
  --member="serviceAccount:infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding cloudappdev-dev \
  --member="serviceAccount:infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding cloudappdev-dev \
  --member="serviceAccount:infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding cloudappdev-dev \
  --member="serviceAccount:infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com" \
  --role="roles/datastore.owner"

# Bind to Kubernetes service account
gcloud iam service-accounts add-iam-policy-binding \
  infrastructure-provisioner-sa@cloudappdev-dev.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:cloudappdev-dev.svc.id.goog[default/infrastructure-provisioner-sa]"
```

### 2. Cloudflare API Token

Create API token with permissions:
- Zone → DNS → Edit
- Zone → SSL and Certificates → Edit

### 3. Kubernetes Secrets

```bash
# Cloudflare credentials
kubectl create secret generic cloudflare-credentials \
  --from-literal=api-token=YOUR_CLOUDFLARE_API_TOKEN \
  --namespace default

# Kubeconfig (for provisioner to manage deployments)
# This is auto-configured via Workload Identity in GKE
```

## Deployment

### Step 1: Build and Push Image

The GitHub Actions workflow automatically builds the infrastructure-provisioner image when you push changes to `services/infrastructure-provisioner/`.

**Manual build:**
```bash
cd services/infrastructure-provisioner

docker build -t europe-west1-docker.pkg.dev/cloudappdev-dev/docker-repo/infrastructure-provisioner:latest .

docker push europe-west1-docker.pkg.dev/cloudappdev-dev/docker-repo/infrastructure-provisioner:latest
```

### Step 2: Deploy to Kubernetes

```bash
# Deploy with Helm
helm upgrade --install infrastructure-provisioner k8s/services/infrastructure-provisioner \
  -f k8s/services/infrastructure-provisioner/values-dev.yaml \
  --namespace default

# Verify deployment
kubectl get pods -l app=infrastructure-provisioner
kubectl logs -f deployment/infrastructure-provisioner

# Check service
kubectl get svc infrastructure-provisioner-service
```

### Step 3: Initialize Terraform State

```bash
# Copy initial tenants.tfvars (empty by default)
cd terraform/environments/dev
cp tenants.tfvars.example tenants.tfvars

# Initialize Terraform (if not already done)
terraform init
```

## Usage

### From Tenant Service

When a tenant is created via the tenant service API, it should automatically call the provisioner:

```typescript
// Example: In tenant-service/src/tenants/tenants.service.ts

import { HttpService } from '@nestjs/axios';

async create(createTenantDto: CreateTenantDto) {
  // 1. Create tenant in database
  const tenant = await this.prisma.tenant.create({
    data: {
      name: createTenantDto.name,
      tier: createTenantDto.tier,
      status: 'pending'
    }
  });

  // 2. Call infrastructure provisioner
  try {
    const response = await this.httpService.axiosRef.post(
      'http://infrastructure-provisioner-service:8080/provision-tenant',
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tier: tenant.tier,
        environment: process.env.ENVIRONMENT || 'dev'
      }
    );

    // 3. Update tenant with infrastructure details
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        domain: response.data.domain,
        namespace: response.data.namespace,
        status: 'active'
      }
    });

    return { ...tenant, infrastructure: response.data };
  } catch (error) {
    // Mark as failed
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'failed' }
    });
    throw new Error(`Infrastructure provisioning failed: ${error.message}`);
  }
}
```

### Manual Provisioning (Testing)

```bash
# Test the provisioner directly
kubectl port-forward svc/infrastructure-provisioner-service 8080:8080

# Provision a new tenant
curl -X POST http://localhost:8080/provision-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "tenantName": "acme-corp",
    "tier": "enterprise",
    "environment": "dev"
  }'

# List provisioned tenants
curl http://localhost:8080/tenants/dev

# Deprovision a tenant
curl -X POST http://localhost:8080/deprovision-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "acme-corp",
    "tier": "enterprise",
    "environment": "dev"
  }'
```

## What Gets Provisioned

### Free Tier Example
**Tenant Name:** `startup-inc`

**Infrastructure:**
- Domain: `startup-inc.cloudappdev.site`
- SSL Certificate: Automatic via Google Certificate Manager
- Namespace: Shared `free` namespace
- Database: Shared free tier database
- Deployment: Shared deployment

### Standard Tier Example
**Tenant Name:** `growing-biz`

**Infrastructure:**
- Domain: `growing-biz.cloudappdev.site`
- SSL Certificate: Automatic
- Namespace: Shared `standard` namespace
- Database: Shared standard tier database
- Deployment: Shared deployment

### Enterprise Tier Example
**Tenant Name:** `acme-corp`

**Infrastructure:**
- Domain: `acme-corp.cloudappdev.site`
- SSL Certificate: Automatic
- **Namespace:** `acme-corp` (dedicated)
- **Databases:**
  - PostgreSQL instance: `cloudappdev-acme-corp-users`
  - PostgreSQL instance: `cloudappdev-acme-corp-itinerary`
  - Firestore database: `acme-corp-social`
  - Storage bucket: `cloudappdev-acme-corp-storage`
- **Service Accounts:**
  - `acme-corp-user-service-sa`
  - `acme-corp-itinerary-service-sa`
  - `acme-corp-social-service-sa`
- **Kubernetes Deployments (in `acme-corp` namespace):**
  - `gateway` (Nginx API Gateway)
  - `app` (Next.js Frontend)
  - `user-service` (NestJS)
  - `itinerary-service` (NestJS)
  - `social-service` (NestJS)

**Shared Services (NOT deployed per-tenant):**
- Tenant Service (default namespace)
- Travel Info Service (default namespace)
- Infrastructure Provisioner (default namespace)

## Verification

### Check DNS Resolution
```bash
# Verify domain is registered
dig acme-corp.cloudappdev.site

# Should return:
# - CNAME or A record pointing to load balancer
# - Non-zero answer section
```

### Check SSL Certificate
```bash
# Verify certificate is provisioned
gcloud certificate-manager certificates list

# Check certificate status (should be ACTIVE)
gcloud certificate-manager certificates describe acme-corp-cloudappdev-site
```

### Check Kubernetes Resources
```bash
# List namespaces
kubectl get namespaces | grep acme-corp

# Check deployments in namespace
kubectl get deployments -n acme-corp

# Check pods
kubectl get pods -n acme-corp

# Check services
kubectl get svc -n acme-corp
```

### Check Databases
```bash
# List Cloud SQL instances
gcloud sql instances list | grep acme-corp

# Check Firestore databases
gcloud firestore databases list

# Check storage buckets
gsutil ls | grep acme-corp
```

## Troubleshooting

### Provisioning Fails

**Check provisioner logs:**
```bash
kubectl logs -f deployment/infrastructure-provisioner
```

**Common issues:**
- Missing GCP permissions → Check service account IAM roles
- Cloudflare API rate limit → Wait and retry
- Terraform state lock → Manual unlock required
- Insufficient quota → Request quota increase

### Domain Not Resolving

**Verify DNS records:**
```bash
# Check Cloudflare
# Login to https://dash.cloudflare.com
# Verify A/CNAME record exists

# Test DNS propagation
dig @1.1.1.1 acme-corp.cloudappdev.site
```

### Certificate Not Active

**Check certificate status:**
```bash
gcloud certificate-manager certificates describe acme-corp-cloudappdev-site

# Look for:
# state: ACTIVE (good)
# state: PROVISIONING (wait 5-10 minutes)
# state: FAILED (check DNS validation)
```

### Kubernetes Deployment Fails

**Check namespace:**
```bash
kubectl get ns acme-corp

# If missing, check Terraform outputs
cd terraform/environments/dev
terraform output enterprise_tenants
```

**Check pod status:**
```bash
kubectl get pods -n acme-corp
kubectl describe pod <pod-name> -n acme-corp

# Common issues:
# - ImagePullBackOff → Check registry permissions
# - CrashLoopBackOff → Check application logs
# - Pending → Check resource requests
```

## Cleanup

### Remove a Tenant

```bash
# Call deprovision API
curl -X POST http://infrastructure-provisioner-service:8080/deprovision-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "acme-corp",
    "tier": "enterprise",
    "environment": "dev"
  }'

# Or manually via Terraform
cd terraform/environments/dev

# Edit tenants.tfvars - remove tenant block
vim tenants.tfvars

# Apply changes (will destroy resources)
terraform apply -var-file=tenants.tfvars

# Delete namespace
kubectl delete namespace acme-corp
```

## Security Best Practices

1. **API Authentication**: Add authentication to provisioner endpoints
2. **Rate Limiting**: Prevent abuse of provisioning API
3. **Audit Logging**: Log all provisioning requests
4. **Secret Rotation**: Regularly rotate Cloudflare API token
5. **RBAC**: Restrict who can create enterprise tenants
6. **Network Policies**: Isolate tenant namespaces

## Cost Optimization

### Per Tenant Costs (Enterprise)
- Cloud SQL PostgreSQL: ~$25/month (db-f1-micro)
- Firestore: Pay per use (~$5-10/month)
- Cloud Storage: Pay per GB (~$1/month)
- Load Balancer: Shared across tenants
- SSL Certificates: Free (Google-managed)
- Compute (GKE): Shared node pool

**Estimated:** $30-40/month per enterprise tenant

### Optimization Tips
- Use shared databases for free/standard tiers
- Enable autoscaling for pods (HPA)
- Use preemptible nodes for non-production
- Implement resource quotas per namespace
- Archive inactive tenant data to cold storage

## Next Steps

- [ ] Add webhook notifications when provisioning completes
- [ ] Implement async job queue for provisioning
- [ ] Add rollback capability for failed provisions
- [ ] Implement cost estimation before provisioning
- [ ] Add multi-region support
- [ ] Implement tenant isolation tests
- [ ] Add monitoring and alerting for tenant health
