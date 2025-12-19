# Users Database
module "users_db" {
  source = "../../modules/cloudsql"

  instance_name          = "${var.project_name}-${var.environment}-users-db"
  database_version       = "POSTGRES_17"
  region                 = var.region
  tier                   = var.db_tier
  edition                = "ENTERPRISE"
  database_name          = local.POSTGRES_NAME
  database_user          = local.POSTGRES_USER
  database_password      = local.POSTGRES_PASSWORD
  deletion_protection    = false
  high_availability      = false
  backup_enabled         = true
  point_in_time_recovery = false
}

# Itinerary Database
module "itinerary_db" {
  source = "../../modules/cloudsql"

  instance_name          = "${var.project_name}-${var.environment}-itinerary-db"
  database_version       = "POSTGRES_17"
  region                 = var.region
  tier                   = var.db_tier
  edition                = "ENTERPRISE"
  database_name          = local.POSTGRES_NAME
  database_user          = local.POSTGRES_USER
  database_password      = local.POSTGRES_PASSWORD
  deletion_protection    = false
  high_availability      = false
  backup_enabled         = true
  point_in_time_recovery = false
}

# Storage Bucket
module "images_bucket" {
  source = "../../modules/storage"

  bucket_name   = "${var.project_name}-${var.environment}-images"
  region        = var.region
  force_destroy = true

  labels = local.common_labels
}

# Firestore Database
module "social_db" {
  source = "../../modules/firestore"

  project          = var.project_id
  database_name    = "${var.project_name}-${var.environment}-social-db"
  region           = var.region
  database_edition = "ENTERPRISE"
  deletion_policy  = "DELETE"
}

# Service Account
module "app_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "run-exec"
  display_name = "Cloud Run Execution - Prod"

  enable_cloudsql  = true
  enable_storage   = true
  enable_firestore = true

  k8s_service_accounts = [
    "cloudappdev-sa",
    "user-service-sa",
    "itinerary-service-sa",
    "social-service-sa"
  ]

  depends_on = [
    module.users_db,
    module.itinerary_db
  ]
}
