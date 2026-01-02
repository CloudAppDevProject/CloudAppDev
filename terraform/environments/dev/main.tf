resource "google_iam_workload_identity_pool" "dev_pool" {
  workload_identity_pool_id = var.project_id
}

resource "google_service_account" "default" {
  account_id   = "service-account-id"
  display_name = "Service Account"
}

resource "google_container_cluster" "primary" {
  name     = "${var.project_id}-cluster"
  location = var.zone

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Enable Workload Identity for Kubernetes service accounts to impersonate GCP service accounts
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}

# Separately managed node pool with Workload Identity enabled
resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.project_id}-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = var.gke_num_nodes

  node_config {
    preemptible  = var.gke_preemptible
    machine_type = var.gke_machine_type

    # Enable Workload Identity on the node pool
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    service_account = google_service_account.default.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = local.common_labels
  }
}

# Users Database
module "users_db" {
  source = "../../modules/cloudsql"

  instance_name       = "${var.project_name}-${var.environment}-users-db"
  database_version    = "POSTGRES_17"
  region              = var.region
  tier                = var.db_tier
  edition             = "ENTERPRISE"
  database_name       = local.POSTGRES_NAME
  database_user       = local.POSTGRES_USER
  database_password   = local.POSTGRES_PASSWORD
  deletion_protection = false
  backup_enabled      = true
}

# Itinerary Database
module "itinerary_db" {
  source = "../../modules/cloudsql"

  instance_name       = "${var.project_name}-${var.environment}-itinerary-db"
  database_version    = "POSTGRES_17"
  region              = var.region
  tier                = var.db_tier
  edition             = "ENTERPRISE"
  database_name       = local.POSTGRES_NAME
  database_user       = local.POSTGRES_USER
  database_password   = local.POSTGRES_PASSWORD
  deletion_protection = false
  backup_enabled      = true
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

# Service Accounts
# Note: All service accounts depend on GKE cluster creation because they use Workload Identity
module "app_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "app-sa"
  display_name = "App Service Account - Dev"

  k8s_service_accounts = [
    "cloudappdev-sa",
  ]

  depends_on = [
    google_container_cluster.primary
  ]
}

module "social_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "social-service-sa"
  display_name = "Social Database access - Dev"

  enable_firestore = true

  k8s_service_accounts = [
    "social-service-sa"
  ]
  depends_on = [
    google_container_cluster.primary,
    module.social_db,
  ]
}

# User Database access
module "user_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "user-service-sa"
  display_name = "User Database access - Dev"

  enable_cloudsql  = true
  enable_storage   = true

  k8s_service_accounts = [
    "user-service-sa",
  ]

  depends_on = [
    google_container_cluster.primary,
    module.users_db,
  ]
}

# Itinerary database access
module "itinerary_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "itinerary-service-sa"
  display_name = "Itinerary Database access - Dev"

  enable_cloudsql  = true
  enable_storage   = true

  k8s_service_accounts = [
    "itinerary-service-sa",
  ]

  depends_on = [
    google_container_cluster.primary,
    module.itinerary_db
  ]
}

# Image Pull Secret for Artifact Registry
module "image_pull_secret" {
  source = "../../modules/image-pull-secret"

  service_account_email = google_service_account.default.email
  namespace             = "default"
  registry_url          = "${var.region}-docker.pkg.dev"
  patch_default_sa      = true

  depends_on = [
    google_container_cluster.primary
  ]
}
