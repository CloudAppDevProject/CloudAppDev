module "databases" {
  source = "../../modules/cloudsql"

  instance_name       = "${var.project_name}-${var.namespace}"
  region              = var.region
  tier                = var.db_tier
  namespace           = var.namespace
  database_names       = [
    "itinerary",
    "users"
  ]
  deletion_protection = false
  backup_enabled      = false
}

module "images_bucket" {
  source = "../storage"
    bucket_name   = "${var.project_name}-${var.namespace}-images"
    region        = var.region
}

# Firestore Database
module "social_db" {
  source = "../../modules/firestore"

  project          = var.project_id
  database_name    = "${var.project_name}-${var.namespace}-social"
  region           = var.region
  database_edition = "ENTERPRISE"
  deletion_policy  = "DELETE"
}

# ========================================
# Service Accounts for this Deployment
# ========================================

# Social Service Account - for Firestore access
module "social_service_account" {
  source = "../service-account"

  project      = var.project_id
  account_id   = "social-${var.namespace}-sa"
  display_name = "Social Database access - ${var.namespace}"
  namespace = var.namespace
  enable_firestore = true

  k8s_service_accounts = [
    "social-${var.namespace}-sa"
  ]

  depends_on = [
    var.gke_cluster_id,
    module.social_db,
  ]
}

# User Service Account - for PostgreSQL and Storage access
module "user_service_account" {
  source = "../service-account"

  project      = var.project_id
  account_id   = "user-${var.namespace}-sa"
  display_name = "User Database access - ${var.namespace}"
  namespace    = var.namespace

  enable_cloudsql = true
  enable_storage  = true

  k8s_service_accounts = [
    "user-${var.namespace}-sa",
  ]

  depends_on = [
    var.gke_cluster_id,
    module.databases,
  ]
}

# Itinerary Service Account - for PostgreSQL and Storage access
module "itinerary_service_account" {
  source = "../service-account"

  project      = var.project_id
  account_id   = "itinerary-${var.namespace}-sa"
  display_name = "Itinerary Database access - ${var.namespace}"
  namespace    = var.namespace

  enable_cloudsql = true
  enable_storage  = true

  k8s_service_accounts = [
    "itinerary-${var.namespace}-sa",
  ]

  depends_on = [
    var.gke_cluster_id,
    module.databases,
  ]
}