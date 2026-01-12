resource "google_iam_workload_identity_pool" "dev_pool" {
  workload_identity_pool_id = var.project_id
}

# GKE Autopilot Cluster - fully managed node provisioning
resource "google_container_cluster" "primary" {
  name     = "${var.project_id}-cluster"
  location = var.region  # Autopilot requires regional cluster

  # Enable Autopilot mode - GCP manages nodes automatically
  enable_autopilot = true
  
  # Workload Identity is automatically enabled in Autopilot
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable Gateway API for Kubernetes Gateway, HTTPRoute, and GKE HealthCheckPolicy resources
  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }

  # Autopilot clusters don't need deletion_protection for dev
  deletion_protection = false
}

# Free Namespace deployment (databases + storage + service accounts)
module "free" {
  source = "../../modules/deployment"

  project_name   = var.project_name
  project_id     = var.project_id
  region         = var.region
  namespace      = "free"
  gke_cluster_id = google_container_cluster.primary.id

  depends_on = [
    google_container_cluster.primary
  ]
}

# Standard Namespace deployment (databases + storage + service accounts)
module "standard" {
  source = "../../modules/deployment"

  project_name   = var.project_name
  project_id     = var.project_id
  region         = var.region
  namespace      = "standard"
  gke_cluster_id = google_container_cluster.primary.id

  depends_on = [
    google_container_cluster.primary,
  ]
}

# Default Namespace databases
module "default_databases" {
  source = "../../modules/cloudsql"

  instance_name       = "${var.project_name}-default"
  region              = var.region
  tier                = var.db_tier
  namespace           = "default"
  database_names      = [
    "tenant"
  ]
  deletion_protection = false
  backup_enabled      = false
}

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

module "tenant_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "tenant-service-default-sa"
  display_name = "Tenant Database access - default"

  enable_cloudsql = true

  k8s_service_accounts = [
    "tenant-service-default-sa"
  ]

  depends_on = [
    google_container_cluster.primary,
    module.default_databases
  ]
}

module "provisioner_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "infrastructure-provisioner-sa"
  display_name = "Infrastructure Provisioner - Dev"

  enable_storage         = true
  enable_terraform_admin = true
  enable_secret_manager  = true

  k8s_service_accounts = [
    "infrastructure-provisioner-sa"
  ]

  depends_on = [
    google_container_cluster.primary
  ]
}

# ========================================
# Certificate Management
# ========================================

# Shared Certificate Map for all domains in this environment
resource "google_certificate_manager_certificate_map" "main" {
  name        = "${var.project_name}-${var.environment}-cert-map"
  description = "Certificate map for all ${var.environment} domains"

  labels = local.common_labels
}

# Main domain certificate (e.g., dev.cloudappdev.site)
# tenant_name is empty, so it registers just var.hostname
module "main_domain" {
  source = "../../modules/domain"

  project_id         = var.project_id
  hostname           = var.hostname
  certificate_map_id = google_certificate_manager_certificate_map.main.name
  cloudflare_zone_id = var.cloudflare_zone_id
  labels = local.common_labels
  create_gateway = true
  create_static_ip = true
  
  depends_on = [ 
    google_container_cluster.primary
  ]
}

