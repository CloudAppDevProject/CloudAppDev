# Deployment Module

This Terraform module creates a complete multi-tenant deployment consisting of:
- PostgreSQL databases (Cloud SQL)
- Cloud Storage bucket for images
- Firestore database for social interactions
- Service accounts with appropriate IAM permissions for each service

## Features

- **Multi-Database Setup**: Creates PostgreSQL databases for users, itineraries, and tenants
- **Object Storage**: Provisions Cloud Storage bucket for image uploads
- **NoSQL Database**: Sets up Firestore for high-volume social interactions
- **Service Accounts**: Creates namespace-specific service accounts with Workload Identity bindings
- **IAM Management**: Automatically assigns appropriate roles to each service account

## Service Accounts Created

Each deployment namespace gets its own set of service accounts:

1. **Social Service Account** (`social-service-{namespace}-sa`)
   - Permissions: Firestore User, Firestore Index Admin
   - Purpose: Access to social database (comments, likes)

2. **User Service Account** (`user-service-{namespace}-sa`)
   - Permissions: Cloud SQL Client, Cloud SQL Instance User, Storage Object Admin
   - Purpose: User database access and avatar uploads

3. **Itinerary Service Account** (`itinerary-service-{namespace}-sa`)
   - Permissions: Cloud SQL Client, Cloud SQL Instance User, Storage Object Admin
   - Purpose: Itinerary database access and image uploads

4. **Tenant Service Account** (`tenant-service-{namespace}-sa`)
   - Permissions: Cloud SQL Client, Cloud SQL Instance User
   - Purpose: Tenant database access

## Usage

```hcl
module "deployment" {
  source = "../../modules/deployment"

  project_name   = "cloudappdev"
  project_id     = "my-gcp-project"
  region         = "europe-west1"
  namespace      = "free"
  gke_cluster_id = google_container_cluster.primary.id

  # Optional
  db_tier = "db-f1-micro"  # Default value

  depends_on = [
    google_container_cluster.primary
  ]
}
```

## Multi-Tenancy Example

Create separate deployments for different service tiers:

```hcl
# Free tier deployment
module "free" {
  source = "../../modules/deployment"

  project_name   = var.project_name
  project_id     = var.project_id
  region         = var.region
  namespace      = "free"
  gke_cluster_id = google_container_cluster.primary.id
}

# Standard tier deployment
module "standard" {
  source = "../../modules/deployment"

  project_name   = var.project_name
  project_id     = var.project_id
  region         = var.region
  namespace      = "standard"
  gke_cluster_id = google_container_cluster.primary.id
  db_tier        = "db-n1-standard-1"  # Better performance
}

# Enterprise tier deployment
module "enterprise" {
  source = "../../modules/deployment"

  project_name   = var.project_name
  project_id     = var.project_id
  region         = var.region
  namespace      = "enterprise"
  gke_cluster_id = google_container_cluster.primary.id
  db_tier        = "db-n1-standard-2"  # Best performance
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | The name of the project | `string` | - | yes |
| project_id | The ID of the GCP project | `string` | - | yes |
| namespace | The namespace for this deployment (e.g., "free", "standard", "enterprise") | `string` | - | yes |
| region | The GCP region where resources will be created | `string` | - | yes |
| gke_cluster_id | The ID of the GKE cluster (for Workload Identity) | `string` | - | yes |
| db_tier | The machine type for Cloud SQL instances | `string` | `"db-f1-micro"` | no |

## Outputs

| Name | Description |
|------|-------------|
| database_instance_name | The name of the Cloud SQL instance |
| database_connection_name | The connection name of the Cloud SQL instance |
| images_bucket_name | The name of the images storage bucket |
| social_db_name | The name of the Firestore database |
| social_service_account_email | Email of the social service account |
| user_service_account_email | Email of the user service account |
| itinerary_service_account_email | Email of the itinerary service account |
| tenant_service_account_email | Email of the tenant service account |
| all_service_accounts | Map of all service account emails |

## Resource Naming Convention

Resources are named using the pattern: `{project_name}-{namespace}-{resource_type}`

Examples:
- Cloud SQL instance: `cloudappdev-free`
- Databases: `cloudappdev-itinerary`, `cloudappdev-tenant`, `cloudappdev-users`
- Storage bucket: `cloudappdev-free-images`
- Firestore database: `cloudappdev-free-social`
- Service accounts: `social-service-free-sa`, `user-service-free-sa`, etc.

## Dependencies

This module requires a GKE cluster to exist before creation due to Workload Identity bindings. Always include the `gke_cluster_id` variable and a `depends_on` block:

```hcl
module "deployment" {
  source = "../../modules/deployment"

  # ... other variables ...
  gke_cluster_id = google_container_cluster.primary.id

  depends_on = [
    google_container_cluster.primary
  ]
}
```

## Kubernetes Integration

Service accounts are automatically bound to Kubernetes service accounts in the `default` namespace using Workload Identity. The binding format is:

```
serviceAccount:{project_id}.svc.id.goog[default/{k8s_service_account_name}]
```

Each microservice in Kubernetes should use the corresponding service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: social-service-free-sa
  namespace: default
  annotations:
    iam.gke.io/gcp-service-account: social-service-free-sa@{project_id}.iam.gserviceaccount.com
```

## Notes

- **Database Deletion Protection**: Currently disabled for development. Enable in production by modifying the `cloudsql` module call.
- **Backup**: Currently disabled. Enable for production deployments.
- **Firestore Edition**: Uses ENTERPRISE edition for better performance. Change to STANDARD for cost optimization if needed.
- **Storage Bucket**: Configured with force_destroy for easy cleanup. Disable in production.

## Related Modules

- [cloudsql](../cloudsql/README.md) - PostgreSQL database instances
- [storage](../storage/README.md) - Cloud Storage buckets
- [firestore](../firestore/README.md) - Firestore NoSQL databases
- [service-account](../service-account/README.md) - GCP service accounts with IAM bindings
