# CloudAppDev Terraform Infrastructure

Multi-environment Terraform configuration for CloudAppDev project with modular architecture.

## Structure

```
terraform/
├── modules/              # Reusable modules
│   ├── cloudsql/        # PostgreSQL instances
│   ├── storage/         # GCS buckets
│   ├── firestore/       # Firestore databases
│   ├── service-account/ # Service accounts & IAM
│   └── vpc/             # VPC networks
├── environments/         # Environment-specific configs
│   ├── dev/             # Development environment
│   └── prod/            # Production environment
├── global/              # Shared resources
│   └── dns/             # Cloudflare DNS
└── scripts/             # Helper scripts
    ├── deploy.sh        # Deployment script
    └── init-env.sh      # Environment initialization
```

## Quick Start

### 1. Initialize Environment

```bash
cd terraform

# Create GCS state bucket for dev
./scripts/init-env.sh dev your-gcp-project-dev

# Create GCS state bucket for prod
./scripts/init-env.sh prod your-gcp-project-prod
```

### 2. Configure Environment

```bash
cd environments/dev

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

### 3. Deploy

```bash
# From terraform/ directory
./scripts/deploy.sh dev plan    # Review changes
./scripts/deploy.sh dev apply   # Apply changes
```

## Environments

### Dev Environment
- **State Bucket:** `cloudappdev-tf-state-dev`
- **Cloud SQL Tier:** db-f1-micro (cost-optimized)
- **Deletion Protection:** Disabled
- **High Availability:** Disabled
- **Resources:**
  - 2x PostgreSQL instances (users, itinerary)
  - 1x GCS bucket (images)
  - 1x Firestore database (social)
  - 1x Service Account
  - 1x VPC network

### Prod Environment
- **State Bucket:** `cloudappdev-tf-state-prod`
- **Cloud SQL Tier:** db-custom-4-16384 (production-grade)
- **Deletion Protection:** Enabled
- **High Availability:** Enabled
- **Point-in-Time Recovery:** Enabled
- **Versioning:** Enabled on storage
- **Resources:** Same as dev, but production-configured

## Modules

### Cloud SQL Module
Creates PostgreSQL instances with configurable HA, backups, and PITR.

```hcl
module "users_db" {
  source = "../../modules/cloudsql"

  instance_name       = "cloudappdev-dev-users-db"
  tier                = "db-f1-micro"
  high_availability   = false
  deletion_protection = false
}
```

### Storage Module
Creates GCS buckets with hierarchical namespace and versioning.

```hcl
module "images_bucket" {
  source = "../../modules/storage"

  bucket_name        = "cloudappdev-dev-images"
  force_destroy      = true
  versioning_enabled = false
}
```

### Firestore Module
Creates Firestore Native databases.

```hcl
module "social_db" {
  source = "../../modules/firestore"

  database_name    = "cloudappdev-dev-social-db"
  database_edition = "ENTERPRISE"
}
```

### Service Account Module
Creates service accounts with IAM roles and Workload Identity bindings.

```hcl
module "app_service_account" {
  source = "../../modules/service-account"

  account_id           = "run-exec"
  enable_cloudsql      = true
  enable_storage       = true
  enable_firestore     = true
  k8s_service_accounts = ["user-service-sa", "itinerary-service-sa"]
}
```

## Commands

### Planning
```bash
./scripts/deploy.sh dev plan     # Plan dev changes
./scripts/deploy.sh prod plan    # Plan prod changes
```

### Applying
```bash
./scripts/deploy.sh dev apply    # Apply dev changes
./scripts/deploy.sh prod apply   # Apply prod changes
```

### Outputs
```bash
./scripts/deploy.sh dev output   # Show dev outputs
./scripts/deploy.sh prod output  # Show prod outputs
```

### Destroying (Careful!)
```bash
./scripts/deploy.sh dev destroy  # Destroy dev resources
./scripts/deploy.sh prod destroy # Destroy prod resources (requires confirmation)
```

## Migration from Old Structure

If migrating from the old single-environment setup:

### 1. Backup Current State
```bash
cd terraform
terraform state pull > backup-state.json
```

### 2. Initialize New Environment
```bash
./scripts/init-env.sh dev your-project-id
```

### 3. Copy Configuration
```bash
cd environments/dev
cp ../../terraform.tfvars terraform.tfvars
```

### 4. Import Existing Resources
```bash
# Import existing resources (example)
terraform import module.users_db.google_sql_database_instance.instance cloudappdev-tf-users-db
```

### 5. Verify No Changes
```bash
terraform plan  # Should show no changes if imports are correct
```

## State Management

- **Backend:** Google Cloud Storage
- **Dev State:** `gs://cloudappdev-tf-state-dev/env/dev`
- **Prod State:** `gs://cloudappdev-tf-state-prod/env/prod`
- **Versioning:** Enabled on all state buckets
- **Locking:** Automatic via GCS

## Secrets

All sensitive values are stored in Google Secret Manager:
- `db_password` - Database password
- `postgres_user` - Database username
- `postgres_name` - Database name
- `cloudflare_api_token` - Cloudflare API token
- `firebase_*` - Firebase configuration

## Best Practices

1. **Always run `plan` before `apply`**
2. **Review changes carefully**, especially for prod
3. **Use separate GCP projects** for dev and prod
4. **Never commit `.tfvars` files** (use `.tfvars.example`)
5. **Enable deletion protection** for prod resources
6. **Use version pinning** in modules
7. **Test changes in dev** before applying to prod

## Workload Identity

The service account module automatically configures Workload Identity for Kubernetes service accounts:

- `cloudappdev-sa` (general)
- `user-service-sa`
- `itinerary-service-sa`
- `social-service-sa`

All bound to the `run-exec` service account in GCP.

## Troubleshooting

### State Lock Issues
```bash
# Force unlock (use with caution)
cd environments/dev
terraform force-unlock <LOCK_ID>
```

### Import Existing Resources
```bash
# Example: Import Cloud SQL instance
terraform import module.users_db.google_sql_database_instance.instance <INSTANCE_NAME>
```

### Check Current State
```bash
terraform show
terraform state list
```

## Resources

- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCP Cloud SQL](https://cloud.google.com/sql/docs)
- [GCS Buckets](https://cloud.google.com/storage/docs)
- [Firestore](https://cloud.google.com/firestore/docs)
- [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
