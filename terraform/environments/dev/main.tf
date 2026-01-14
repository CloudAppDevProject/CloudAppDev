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

module "provisioning_service_account" {
  source = "../../modules/service-account"

  project      = var.project_id
  account_id   = "provisioning-service-sa"
  display_name = "Provisioning Service - Dev"

  enable_storage         = true
  enable_terraform_admin = true
  enable_secret_manager  = true

  k8s_service_accounts = [
    "provisioning-service-sa"
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
  labels             = local.common_labels

  depends_on = [
    google_container_cluster.primary
  ]
}

# ========================================
# Kubernetes Gateway API Resources
# ========================================

# Reserve a global static external IP for the main Gateway
resource "google_compute_global_address" "main_gateway_ip" {
  name        = "main-gateway-ip"
  description = "Static external IP for main Gateway"

  labels = merge(
    local.common_labels,
    {
      managed_by = "terraform"
    }
  )
}

# External Gateway using Gateway API
# This creates a GCP Global External HTTP(S) Load Balancer
resource "kubernetes_manifest" "main_gateway" {
  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "main-gateway"
      namespace = "default"

      labels = {
        app        = "main-gateway"
        managed_by = "terraform"
      }

      annotations = {
        "networking.gke.io/global-static-ip-name" = google_compute_global_address.main_gateway_ip.name
        "networking.gke.io/certmap"               = google_certificate_manager_certificate_map.main.name
      }
    }

    spec = {
      gatewayClassName = "gke-l7-global-external-managed"

      listeners = [
        {
          name     = "http"
          protocol = "HTTP"
          port     = 80
          allowedRoutes = {
            namespaces = {
              from = "All"
            }
          }
        },
        {
          name     = "https"
          protocol = "HTTPS"
          port     = 443
          allowedRoutes = {
            namespaces = {
              from = "All"
            }
          }
        }
      ]
    }
  }

  depends_on = [
    google_container_cluster.primary,
    google_compute_global_address.main_gateway_ip
  ]
}

# Cloudflare DNS A record pointing to the main Gateway IP
resource "cloudflare_dns_record" "main_gateway" {
  zone_id = var.cloudflare_zone_id
  name    = var.hostname
  content = google_compute_global_address.main_gateway_ip.address
  type    = "A"
  ttl     = 300
  proxied = false

  depends_on = [
    kubernetes_manifest.main_gateway
  ]
}

