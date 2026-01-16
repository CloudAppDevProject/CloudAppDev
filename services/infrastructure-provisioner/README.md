# Infrastructure Provisioner Service

Automated infrastructure provisioning service for multi-tenant CloudAppDev deployments.

## Overview

This service provides an API that the tenant-service can call to automatically provision infrastructure for new tenants:

- **All Tenants**: Get unique subdomain `{tenant-name}.cloudappdev.site` with SSL certificate
- **Enterprise Tenants**: Additionally get dedicated Kubernetes namespace with full stack deployment

## Architecture

```
Tenant Service
    ↓ HTTP POST
Infrastructure Provisioner (this service)
    ↓
├─→ Updates tenants.tfvars
├─→ Runs terraform apply
│   └─→ Creates subdomain + SSL cert (all tiers)
│   └─→ Creates namespace + databases (enterprise only)
└─→ Deploys Kubernetes resources (enterprise only)
    └─→ Gateway, Frontend, User, Itinerary, Social services
```

## API Endpoints

### POST /provision-tenant

Provisions infrastructure for a new tenant.

**Request:**
```json
{
  "tenantId": 123,
  "tenantName": "acme-corp",
  "tier": "enterprise",
  "environment": "dev"
}
```

**Response:**
```json
{
  "success": true,
  "tenantId": 123,
  "tenantName": "acme-corp",
  "tier": "enterprise",
  "domain": "https://acme-corp.cloudappdev.site",
  "namespace": "acme-corp",
  "infrastructure": {
    "terraform": {
      "success": true,
      "output": "..."
    },
    "deployment": {
      "namespace": "acme-corp",
      "deployments": [...]
    }
  },
  "message": "Infrastructure provisioned successfully"
}
```

### POST /deprovision-tenant

Removes infrastructure for a tenant.

**Request:**
```json
{
  "tenantName": "acme-corp",
  "tier": "enterprise",
  "environment": "dev"
}
```

### GET /tenants/:environment

Lists all provisioned tenants in an environment.

**Response:**
```json{
  "success": true,
  "environment": "dev",
  "tenants": {
    "enterprise": {
      "acme-corp": {
        "domain": "acme-corp.cloudappdev.site",
        "namespace": "acme-corp"
      }
    },
    "domains": {
      "acme-corp": "https://acme-corp.cloudappdev.site",
      "startup-inc": "https://startup-inc.cloudappdev.site"
    }
  }
}
```

### GET /health

Health check endpoint.

## What Gets Provisioned

### All Tiers (Free, Standard, Enterprise)

1. **Cloudflare DNS Record**: `{tenant-name}.cloudappdev.site` → Load Balancer IP
2. **Google Certificate Manager**:
   - DNS authorization for domain validation
   - SSL certificate
   - Certificate map entry
3. **Load Balancer Configuration**: Routes traffic to shared API Gateway

### Enterprise Tier Only

4. **Kubernetes Namespace**: `{tenant-name}`
5. **Cloud SQL Databases**:
   - PostgreSQL for users
   - PostgreSQL for itineraries
6. **Firestore Database**: For social interactions
7. **Cloud Storage Bucket**: For file uploads
8. **Service Accounts**:
   - `{tenant}-user-service-sa`
   - `{tenant}-itinerary-service-sa`
   - `{tenant}-social-service-sa`
9. **Kubernetes Deployments**:
   - API Gateway (Nginx)
   - Frontend (Next.js)
   - User Service (NestJS)
   - Itinerary Service (NestJS)
   - Social Service (NestJS)

**Shared Services** (not deployed per-tenant):
- Tenant Service (in default namespace)
- Travel Info Service (in default namespace)

## Integration with Tenant Service

The tenant service should call this API when a new tenant is registered:

```javascript
// In tenant-service/src/tenants/tenants.service.ts

async create(createTenantDto: CreateTenantDto) {
  // 1. Create tenant in database
  const tenant = await this.prisma.tenant.create({
    data: createTenantDto
  });

  // 2. Call infrastructure provisioner
  try {
    const response = await this.httpService.post(
      `http://infrastructure-provisioner-service:8080/provision-tenant`,
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tier: tenant.tier,
        environment: process.env.ENVIRONMENT || 'dev'
      }
    ).toPromise();

    // 3. Update tenant with infrastructure details
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        domain: response.data.domain,
        namespace: response.data.namespace,
        infrastructureStatus: 'provisioned'
      }
    });
  } catch (error) {
    // Handle provisioning failure
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { infrastructureStatus: 'failed' }
    });
    throw error;
  }

  return tenant;
}
```

## Deployment

### Build Docker Image

```bash
cd services/infrastructure-provisioner
docker build -t europe-west1-docker.pkg.dev/cloudappdev-dev/docker-repo/infrastructure-provisioner:latest .
docker push europe-west1-docker.pkg.dev/cloudappdev-dev/docker-repo/infrastructure-provisioner:latest
```

### Deploy to Kubernetes

```bash
cd k8s/services/infrastructure-provisioner
helm upgrade --install infrastructure-provisioner . \
  -f values-dev.yaml \
  --namespace default
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `PORT` | API server port | `8080` |
| `ENVIRONMENT` | Deployment environment | `dev` |
| `GCP_PROJECT` | GCP project ID | `cloudappdev-dev` |
| `GCP_REGION` | GCP region | `europe-west1` |
| `TERRAFORM_STATE_BUCKET` | GCS bucket for Terraform state | `cloudappdev-dev-terraform-state` |
| `TERRAFORM_STATE_PREFIX` | State file prefix | `environments/dev` |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID | `ddbd4781...` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (secret) | `***` |

## Prerequisites

### GCP Service Account Permissions

The service account must have:

- **Compute Admin** - Manage load balancers
- **Certificate Manager Admin** - Manage SSL certificates
- **DNS Administrator** - Manage Cloud DNS (if used)
- **Kubernetes Engine Admin** - Manage GKE resources
- **Cloud SQL Admin** - Manage databases
- **Storage Admin** - Manage Cloud Storage buckets
- **Firestore Admin** - Manage Firestore databases
- **Service Account Admin** - Create service accounts

### Cloudflare Permissions

API token must have:

- **Zone:DNS:Edit** - Manage DNS records
- **Zone:SSL and Certificates:Edit** - Manage certificates

### Kubernetes Permissions

The service needs `cluster-admin` role to create namespaces and deploy resources.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: infrastructure-provisioner-admin
subjects:
- kind: ServiceAccount
  name: infrastructure-provisioner-sa
  namespace: default
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

## Security Considerations

1. **API Authentication**: Add authentication middleware to prevent unauthorized provisioning
2. **Rate Limiting**: Limit provisioning requests to prevent abuse
3. **Audit Logging**: Log all provisioning requests with timestamps and user info
4. **Secret Management**: Use Kubernetes Secrets for sensitive credentials
5. **Network Policies**: Restrict which services can call the provisioner

## Troubleshooting

### Terraform Apply Fails

**Check logs:**
```bash
kubectl logs -f deployment/infrastructure-provisioner
```

**Common issues:**
- Missing GCP permissions
- Cloudflare API rate limit
- Terraform state lock

### Kubernetes Deployment Fails

**Check namespace:**
```bash
kubectl get namespaces
kubectl get pods -n {tenant-name}
```

**Common issues:**
- Image pull errors (check registry permissions)
- Insufficient resources
- Missing secrets

### Domain Not Resolving

**Check DNS records:**
```bash
dig {tenant-name}.cloudappdev.site
```

**Verify Cloudflare:**
- Login to Cloudflare dashboard
- Check DNS records in zone
- Verify proxy status (should be DNS only for certificates)

## Local Development

```bash
cd services/infrastructure-provisioner

# Install dependencies
npm install

# Set environment variables
export ENVIRONMENT=dev
export GCP_PROJECT=cloudappdev-dev
export CLOUDFLARE_ZONE_ID=ddbd47810ae075fc0bc55a4ef05a91ec
export CLOUDFLARE_API_TOKEN=your_token

# Run server
npm start

# Test endpoint
curl -X POST http://localhost:8080/provision-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "tenantName": "test-tenant",
    "tier": "enterprise",
    "environment": "dev"
  }'
```

## Future Enhancements

- [ ] Async provisioning with job queue (Bull/Redis)
- [ ] Webhook notifications when provisioning completes
- [ ] Rollback capability for failed deployments
- [ ] Cost estimation before provisioning
- [ ] Multi-region support
- [ ] Blue-green deployment support
- [ ] Automatic scaling policies per tenant
- [ ] Tenant isolation verification tests
