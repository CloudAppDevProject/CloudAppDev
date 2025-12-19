# Terraform Initialization Scripts

This directory contains helper scripts for initializing and managing CloudAppDev Terraform infrastructure.

## Scripts Overview

### `init-env.sh` - Environment Initialization Script

Prepares a new GCP project for Terraform deployment by:
1. **Enabling all required GCP APIs** (17 APIs)
2. **Creating a GCS bucket** for Terraform state storage with versioning

#### Prerequisites

- **Google Cloud SDK (`gcloud`)** installed and authenticated
- **gsutil** (included with gcloud)
- Appropriate **GCP permissions**:
  - `roles/serviceusage.serviceUsageAdmin` - Enable/disable APIs
  - `roles/storage.admin` - Create GCS buckets
  - `roles/resourcemanager.projectIamAdmin` - Manage project IAM

#### Usage

```bash
cd terraform/scripts
./init-env.sh <environment> <project-id>
```

**Arguments:**
- `environment` - Environment name (`dev` or `prod`)
- `project-id` - Your GCP project ID

**Example:**
```bash
./init-env.sh dev my-cloudapp-dev-123456
./init-env.sh prod my-cloudapp-prod-789012
```

#### What Gets Enabled

The script enables the following GCP APIs:

##### Core Infrastructure
- `cloudresourcemanager.googleapis.com` - Resource Manager API (project management)
- `serviceusage.googleapis.com` - Service Usage API (enable/disable APIs)
- `iam.googleapis.com` - Identity and Access Management API

##### Compute & Networking
- `compute.googleapis.com` - Compute Engine API (VPC, networking, load balancers)

##### Databases
- `sqladmin.googleapis.com` - Cloud SQL Admin API (PostgreSQL instances)
- `firestore.googleapis.com` - Firestore API (NoSQL database)

##### Storage
- `storage.googleapis.com` - Cloud Storage API (GCS buckets)
- `storage-api.googleapis.com` - Cloud Storage JSON API

##### Secrets & Configuration
- `secretmanager.googleapis.com` - Secret Manager API (sensitive data)

##### Container & Kubernetes
- `container.googleapis.com` - Google Kubernetes Engine (GKE) API
- `artifactregistry.googleapis.com` - Artifact Registry API (Docker images)

##### Cloud Run (PaaS)
- `run.googleapis.com` - Cloud Run API

##### Monitoring & Logging
- `logging.googleapis.com` - Cloud Logging API
- `monitoring.googleapis.com` - Cloud Monitoring API

##### Networking Services
- `servicenetworking.googleapis.com` - Service Networking API (VPC peering)
- `dns.googleapis.com` - Cloud DNS API

#### Output Example

```
╔════════════════════════════════════════════════════════╗
║  CloudAppDev - Environment Initialization Script      ║
╚════════════════════════════════════════════════════════╝

Environment: dev
GCP Project: my-cloudapp-dev-123456
State Bucket: cloudappdev-tf-state-dev

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Enabling Required GCP APIs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking and enabling 17 required APIs...

✓ cloudresourcemanager - already enabled
✓ serviceusage - already enabled
⟳ iam - enabling...
✓ iam - enabled successfully
✓ compute - already enabled
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API Enablement Summary:
  Already Enabled: 12
  Newly Enabled:   5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Waiting 10 seconds for API changes to propagate...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 2: Creating Terraform State Bucket
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating GCS bucket for Terraform state...
Enabling versioning on state bucket...
✅ State bucket created successfully

╔════════════════════════════════════════════════════════╗
║  Environment Initialization Complete!                  ║
╚════════════════════════════════════════════════════════╝

✓ All required GCP APIs are enabled
✓ Terraform state bucket is ready

Next steps:
1. Copy terraform.tfvars.example to terraform.tfvars in environments/dev/
   cp environments/dev/terraform.tfvars.example environments/dev/terraform.tfvars

2. Fill in your actual values in terraform.tfvars
   nano environments/dev/terraform.tfvars

3. Initialize Terraform backend
   cd terraform && terraform init -backend-config=environments/dev/backend.tf

4. Plan your infrastructure
   ./scripts/deploy.sh dev plan

5. Apply your infrastructure
   ./scripts/deploy.sh dev apply
```

#### Features

- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Smart detection** - Only enables APIs that aren't already enabled
- ✅ **Error handling** - Fails fast if APIs cannot be enabled
- ✅ **Progress tracking** - Clear visual feedback with counters
- ✅ **API propagation delay** - Waits 10 seconds after enabling APIs
- ✅ **Versioned state bucket** - Automatic versioning for state file safety

#### Troubleshooting

**Error: Permission denied**
```bash
ERROR: (gcloud.services.enable) User [...] does not have permission to access service [...]
```
**Solution:** Ensure your account has `roles/serviceusage.serviceUsageAdmin` role:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin"
```

**Error: Bucket already exists**
```
⚠️  Bucket cloudappdev-tf-state-dev already exists
```
**Solution:** This is just a warning. The script continues normally and skips bucket creation.

**Error: API enablement failed**
```
✗ sqladmin - failed to enable
```
**Solution:** Check billing is enabled on the project:
```bash
gcloud beta billing projects describe PROJECT_ID
```

#### Manual API Enablement (Alternative)

If you prefer to enable APIs manually or via gcloud CLI:

```bash
# Enable all at once
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  iam.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  storage-api.googleapis.com \
  secretmanager.googleapis.com \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  servicenetworking.googleapis.com \
  dns.googleapis.com \
  --project=PROJECT_ID
```

## Complete Workflow

### First-Time Setup

1. **Authenticate with GCP**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Run initialization script**
   ```bash
   cd terraform/scripts
   ./init-env.sh dev YOUR_PROJECT_ID
   ```

3. **Configure Terraform variables**
   ```bash
   cd ../environments/dev
   cp terraform.tfvars.example terraform.tfvars
   nano terraform.tfvars  # Fill in your values
   ```

4. **Initialize Terraform**
   ```bash
   cd ../..
   terraform init -backend-config=environments/dev/backend.tf
   ```

5. **Plan infrastructure**
   ```bash
   terraform plan -var-file=environments/dev/terraform.tfvars
   ```

6. **Apply infrastructure**
   ```bash
   terraform apply -var-file=environments/dev/terraform.tfvars
   ```

### Multi-Environment Setup

For production environment, repeat the process:

```bash
# 1. Initialize production environment
./scripts/init-env.sh prod YOUR_PROD_PROJECT_ID

# 2. Configure production variables
cd environments/prod
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 3. Initialize and apply
cd ../..
terraform init -backend-config=environments/prod/backend.tf
terraform plan -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

## State Bucket Details

The script creates a GCS bucket with the following configuration:

- **Naming:** `cloudappdev-tf-state-{environment}`
- **Location:** `europe-west1` (regional)
- **Versioning:** Enabled (protects against accidental deletion/corruption)
- **Lifecycle:** No automatic deletion rules

**Best Practices:**
- Keep state buckets in the same region as your resources
- Enable versioning (done automatically)
- Restrict access with IAM policies
- Never commit state files to Git

## Related Documentation

- [Terraform Backend Configuration](../README.md)
- [GCP API Reference](https://cloud.google.com/apis/docs/overview)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [12-Factor App Compliance](../../CLAUDE.md#12-factor-app-compliance-milestone-2-requirement)

## Support

For issues or questions:
- Check [CLAUDE.md](../../CLAUDE.md) for comprehensive project documentation
- Review [Terraform troubleshooting guide](../README.md#troubleshooting)
- Contact: markus.eiglsperger@htwg-konstanz.de
