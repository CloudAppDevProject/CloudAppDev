# CloudAppDev Umbrella Helm Chart

This is the **umbrella Helm chart** for the complete CloudAppDev microservices stack. It packages and deploys all services together as a single release.

## Overview

The CloudAppDev chart includes the following components:

1. **App** - Next.js frontend application
2. **API Gateway** - Nginx API Gateway (reverse proxy)
3. **User Service** - User management and authentication microservice
4. **Itinerary Service** - Travel itinerary management microservice
5. **Social Service** - Comments, likes, and newsletter microservice

## Architecture

This chart uses Helm's **dependency system** to package multiple sub-charts:

```
cloudappdev/
├── Chart.yaml           # Main chart with dependencies
├── values-dev.yaml      # Development environment values
├── values-prod.yaml     # Production environment values
└── charts/              # Sub-chart dependencies (auto-downloaded)
    ├── app/
    ├── api-gateway/
    ├── user-service/
    ├── itinerary-service/
    └── social-service/
```

## Prerequisites

- Kubernetes cluster (GKE, Minikube, etc.)
- Helm 3.x installed
- `kubectl` configured to access your cluster
- Kubernetes secrets created for each service:
  - `user-service-secrets`
  - `itinerary-service-secrets`
  - `social-service-secrets`

## Installation

### 1. Update Dependencies

Before deploying, download all sub-chart dependencies:

```bash
cd k8s/namespace
helm dependency update
```

This will download all sub-charts defined in `Chart.yaml` into the `charts/` directory.

### 2. Install the Chart

#### Development Environment

```bash
# Install with development values
helm install cloudappdev . \
  --namespace default \
  --values values-dev.yaml

# Or upgrade if already installed
helm upgrade --install cloudappdev . \
  --namespace default \
  --values values-dev.yaml
```

#### Production Environment

```bash
# Install with production values
helm install cloudappdev . \
  --namespace default \
  --values values-prod.yaml

# Or upgrade if already installed
helm upgrade --install cloudappdev . \
  --namespace default \
  --values values-prod.yaml
```

### 3. Verify Deployment

```bash
# Check release status
helm list -n default

# Check all pods
kubectl get pods -n default

# Check all services
kubectl get services -n default

# View deployment details
helm status cloudappdev -n default
```

## Configuration

### Enabling/Disabling Services

You can selectively enable or disable services by modifying the values file:

```yaml
# values-dev.yaml or values-prod.yaml
app:
  enabled: true       # Deploy frontend

api-gateway:
  enabled: true       # Deploy API Gateway

user-service:
  enabled: true       # Deploy User Service

itinerary-service:
  enabled: false      # Skip Itinerary Service

social-service:
  enabled: true       # Deploy Social Service
```

### Custom Values

You can override specific values from the command line:

```bash
# Override image tags
helm upgrade --install cloudappdev . \
  --namespace default \
  --values values-dev.yaml \
  --set user-service.image.tag=v1.2.3 \
  --set api-gateway.image.tag=v2.0.0

# Disable a specific service
helm upgrade --install cloudappdev . \
  --namespace default \
  --values values-dev.yaml \
  --set social-service.enabled=false

# Change autoscaling settings
helm upgrade --install cloudappdev . \
  --namespace default \
  --values values-dev.yaml \
  --set user-service.autoscaling.maxReplicas=20
```

## Global Values

The umbrella chart provides global values that are shared across all sub-charts:

```yaml
global:
  namespace: default
  environment: dev
  gcpProject: cloudappdev-dev
  gcpRegion: europe-west1
  imageRegistry: europe-west1-docker.pkg.dev/cloudappdev-dev/docker-repo
  imagePullPolicy: IfNotPresent
  domain: dev.cloudappdev.site
```

These values can be referenced in sub-charts as `{{ .Values.global.<key> }}`.

## Managing Releases

### Upgrade

```bash
# Upgrade with new values
helm upgrade cloudappdev . \
  --namespace default \
  --values values-dev.yaml
```

### Rollback

```bash
# Rollback to previous release
helm rollback cloudappdev -n default

# Rollback to specific revision
helm rollback cloudappdev 2 -n default
```

### Uninstall

```bash
# Completely remove the release
helm uninstall cloudappdev -n default

# This will delete all resources created by the chart
```

## Viewing Chart Structure

### List Dependencies

```bash
helm dependency list
```

### Show All Values

```bash
# Show computed values for development
helm template cloudappdev . --values values-dev.yaml > output-dev.yaml

# Show computed values for production
helm template cloudappdev . --values values-prod.yaml > output-prod.yaml
```

### Dry Run

```bash
# Test installation without applying
helm install cloudappdev . \
  --namespace default \
  --values values-dev.yaml \
  --dry-run --debug
```

## Sub-Chart References

Each sub-chart has its own configuration and can also be deployed independently:

- **App**: `k8s/app/`
- **Gateway**: `k8s/gateway/`
- **User Service**: `k8s/services/user/`
- **Itinerary Service**: `k8s/services/itinerary/`
- **Social Service**: `k8s/services/social/`

## Environment-Specific Differences

### Development (`values-dev.yaml`)
- Uses `dev.cloudappdev.site` domain
- Lower resource limits
- `imagePullPolicy: IfNotPresent` (uses cached images)
- Fewer replicas (min: 1, max: 5-10)

### Production (`values-prod.yaml`)
- Uses `cloudappdev.site` domain
- Higher resource limits
- `imagePullPolicy: Always` (always pulls latest)
- More replicas (min: 2, max: 10-100)
- Enhanced monitoring and logging

## Troubleshooting

### Dependencies Not Found

```bash
# Re-download dependencies
helm dependency update
```

### Release Already Exists

```bash
# Use upgrade instead of install
helm upgrade --install cloudappdev . \
  --namespace default \
  --values values-dev.yaml
```

### Chart Rendering Errors

```bash
# Validate chart syntax
helm lint .

# Debug with dry-run
helm install cloudappdev . \
  --namespace default \
  --values values-dev.yaml \
  --dry-run --debug
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n default

# View pod logs
kubectl logs <pod-name> -n default

# Describe pod for events
kubectl describe pod <pod-name> -n default
```

### Missing Secrets

Ensure all required Kubernetes secrets are created before installation:

```bash
kubectl get secrets -n default | grep -E 'user-service-secrets|itinerary-service-secrets|social-service-secrets'
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Deploy with Helm
  run: |
    cd k8s/namespace
    helm dependency update
    helm upgrade --install cloudappdev . \
      --namespace default \
      --values values-${{ env.ENVIRONMENT }}.yaml \
      --wait --timeout 10m
```

### Terraform Integration

You can also use Terraform to deploy this Helm chart:

```hcl
resource "helm_release" "cloudappdev" {
  name       = "cloudappdev"
  chart      = "../../k8s/namespace"
  namespace  = "default"

  values = [
    file("../../k8s/namespace/values-${var.environment}.yaml")
  ]

  set {
    name  = "app.image.tag"
    value = var.app_version
  }
}
```

## Chart Versioning

The umbrella chart follows **Semantic Versioning**:

- **version**: Chart version (incremented on chart changes)
- **appVersion**: Application version (reflects deployed app version)

Update `Chart.yaml` when making changes:

```yaml
version: 1.0.1  # Increment on chart changes
appVersion: "0.1.0"  # Update when app versions change
```

## Best Practices

1. **Always use `helm dependency update`** before deploying or upgrading
2. **Use `--dry-run --debug`** to preview changes before applying
3. **Tag releases** with meaningful versions
4. **Store secrets** in Kubernetes Secrets or external secret managers (not in values files)
5. **Use `helm test`** for post-deployment verification (if test templates exist)
6. **Monitor rollouts** with `kubectl rollout status`

## Links

- [Helm Documentation](https://helm.sh/docs/)
- [Helm Dependency System](https://helm.sh/docs/helm/helm_dependency/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [CloudAppDev Project](https://github.com/markus-eiglsperger/CloudAppDev)

## Support

For issues or questions:
- **Course Instructor**: Prof. Dr. Markus Eiglsperger (markus.eiglsperger@htwg-konstanz.de)
- **GitHub Issues**: CloudAppDev repository

---

**Last Updated**: 2026-01-13
**Chart Version**: 1.0.0
**App Version**: 0.0.9
