# Firestore Module

Creates a Firestore database in Native mode.

## Features

- Firestore Native database creation
- Configurable database edition
- Deletion policy support

## Usage

```hcl
module "social_db" {
  source = "../../modules/firestore"

  project          = var.project_id
  database_name    = "cloudappdev-dev-social-db"
  region           = "europe-west1"
  database_edition = "ENTERPRISE"
  deletion_policy  = "DELETE"
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project | GCP project ID | string | - | yes |
| database_name | Database name | string | - | yes |
| region | GCP region | string | - | yes |
| database_edition | Edition (ENTERPRISE or FIRESTORE_LITE) | string | ENTERPRISE | no |
| deletion_policy | Deletion policy (DELETE or ABANDON) | string | DELETE | no |

## Outputs

| Name | Description |
|------|-------------|
| database_name | Firestore database name |
| database_id | Firestore database ID |
