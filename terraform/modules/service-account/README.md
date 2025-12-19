# Service Account Module

Creates a GCP service account with IAM role bindings and Workload Identity support for Kubernetes.

## Features

- Service account creation
- Service account key generation
- IAM role bindings (Cloud SQL, Storage, Firestore)
- Workload Identity bindings for K8s service accounts
- Configurable permissions

## Usage

```hcl
module "app_sa" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "run-exec"
  display_name = "Cloud Run Execution"

  enable_cloudsql  = true
  enable_storage   = true
  enable_firestore = true

  k8s_service_accounts = [
    "cloudappdev-sa",
    "user-service-sa",
    "itinerary-service-sa",
    "social-service-sa"
  ]
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project | GCP project ID | string | - | yes |
| account_id | Service account ID | string | - | yes |
| display_name | Display name | string | - | yes |
| key_rotation | Key rotation version | string | v1 | no |
| enable_cloudsql | Grant Cloud SQL permissions | bool | false | no |
| enable_storage | Grant Storage permissions | bool | false | no |
| enable_firestore | Grant Firestore permissions | bool | false | no |
| k8s_service_accounts | K8s SA names for Workload Identity | list(string) | [] | no |

## Outputs

| Name | Description |
|------|-------------|
| service_account_email | Service account email |
| service_account_name | Service account name |
| service_account_key | SA key (base64 encoded, sensitive) |
