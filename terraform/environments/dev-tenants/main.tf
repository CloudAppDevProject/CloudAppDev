# ========================================
# Tenant Infrastructure (Separate State)
# ========================================
# This file manages ONLY tenant-specific resources
# Base infrastructure (GKE, networks, etc.) is in ../dev/

# Import GKE cluster reference from base infrastructure
data "google_container_cluster" "primary" {
  name     = "${var.project_id}-cluster"
  location = var.region
}

# Import certificate map from base infrastructure
data "google_certificate_manager_certificate_map" "main" {
  name = "${var.project_name}-${var.environment}-cert-map"
}

# Common labels for all tenant resources
locals {
  common_labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    component   = "tenant-infrastructure"
  }

  all_tenants = {
    for t in var.tenants : t.name => t
  }

  enterprise_tenants = {
    for t in var.tenants : t.name => t
    if t.tier == "enterprise"
  }
}

# ========================================
# Domain for ALL Tenants
# ========================================

module "tenant_domain" {
  source   = "../../modules/domain"
  for_each = local.all_tenants

  project_id         = var.project_id
  hostname           = "cloudappdev.site"
  certificate_map_id = data.google_certificate_manager_certificate_map.main.name
  cloudflare_zone_id = var.cloudflare_zone_id
  tenant_name        = each.key

  labels = merge(local.common_labels, {
    tenant = each.key
    tier   = each.value.tier
  })
}

# ========================================
# Dedicated Namespace for Enterprise
# ========================================

module "enterprise_namespace" {
  source   = "../../modules/deployment"
  for_each = local.enterprise_tenants

  project_name   = var.project_name
  project_id     = var.project_id
  region         = var.region
  namespace      = each.key
  gke_cluster_id = data.google_container_cluster.primary.id
}
