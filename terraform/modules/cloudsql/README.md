# Cloud SQL Module

Creates a Cloud SQL PostgreSQL instance with database and user.

## Features

- PostgreSQL instance creation
- Automatic database creation
- User creation with password
- Optional high availability (REGIONAL)
- Optional automated backups
- Deletion protection support

## Usage

```hcl
module "users_db" {
  source = "../../modules/cloudsql"

  instance_name      = "cloudappdev-dev-users-db"
  database_version   = "POSTGRES_17"
  region             = "europe-west1"
  tier               = "db-f1-micro"
  database_name      = "cloudappdev"
  database_user      = "cloudappdev_user"
  database_password  = var.postgres_password
  deletion_protection = false
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| instance_name | Name of the Cloud SQL instance | string | - | yes |
| database_version | PostgreSQL version | string | POSTGRES_17 | no |
| region | GCP region | string | - | yes |
| tier | Machine tier | string | - | yes |
| edition | Database edition | string | ENTERPRISE | no |
| database_name | Name of database | string | - | yes |
| database_user | Database username | string | - | yes |
| database_password | Database password | string | - | yes |
| deletion_protection | Enable deletion protection | bool | false | no |
| high_availability | Enable HA | bool | false | no |
| backup_enabled | Enable backups | bool | true | no |

## Outputs

| Name | Description |
|------|-------------|
| instance_name | Cloud SQL instance name |
| instance_connection_name | Connection string (project:region:instance) |
| database_name | Database name |
