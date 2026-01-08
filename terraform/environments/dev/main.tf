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

# Tenant Database
module "tenant_db" {
  source = "../../modules/cloudsql"

  instance_name       = "${var.project_name}-${var.environment}-tenant-db"
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

# Tenant database access
module "tenant_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "tenant-service-sa"
  display_name = "Tenant Database access - Dev"

  enable_cloudsql = true

  k8s_service_accounts = [
    "tenant-service-sa",
  ]

  depends_on = [
    google_container_cluster.primary,
    module.tenant_db
  ]
}

# DNS Authorization for Certificate Manager
resource "google_certificate_manager_dns_authorization" "default" {
  name        = "${var.project_name}-${var.environment}-dns-auth"
  description = "DNS authorization for ${var.hostname}"
  domain      = var.hostname

  labels = local.common_labels
}

# Create the DNS validation record in Cloudflare
resource "cloudflare_dns_record" "cert_validation" {
  zone_id = var.cloudflare_zone_id
  # Strip trailing dot from FQDN for Cloudflare
  name    = trimsuffix(google_certificate_manager_dns_authorization.default.dns_resource_record[0].name, ".")
  content = trimsuffix(google_certificate_manager_dns_authorization.default.dns_resource_record[0].data, ".")
  type    = google_certificate_manager_dns_authorization.default.dns_resource_record[0].type
  ttl     = 300
  proxied = false  # Must be false for DNS validation
}

# Google-managed SSL Certificate for HTTPS (with DNS authorization)
resource "google_certificate_manager_certificate" "default" {
  name        = "${var.project_name}-${var.environment}-cert"
  description = "Google-managed SSL certificate for ${var.hostname}"

  managed {
    domains            = [var.hostname]
    dns_authorizations = [google_certificate_manager_dns_authorization.default.id]
  }

  labels = local.common_labels
}

# Certificate Map for Gateway API
resource "google_certificate_manager_certificate_map" "default" {
  name        = "${var.project_name}-${var.environment}-cert-map"
  description = "Certificate map for ${var.hostname}"

  labels = local.common_labels
}

# Certificate Map Entry - links the certificate to the map
resource "google_certificate_manager_certificate_map_entry" "default" {
  name         = "${var.project_name}-${var.environment}-cert-map-entry"
  description  = "Certificate map entry for ${var.hostname}"
  map          = google_certificate_manager_certificate_map.default.name
  certificates = [google_certificate_manager_certificate.default.id]
  hostname     = var.hostname
}

