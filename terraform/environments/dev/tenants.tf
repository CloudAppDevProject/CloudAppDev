# ========================================
# Dynamic Tenant Infrastructure
# ========================================
# ALL TENANTS: Get subdomain {tenant-name}.cloudappdev.site
# ENTERPRISE ONLY: Additionally get dedicated namespace + full stack
#
# Managed by infrastructure-provisioner service via tenants.tfvars

variable "tenants" {
  description = "List of tenants to provision"
  type = list(object({
    name = string # Tenant slug (e.g., "acme-corp")
    tier = string # "free", "standard", or "enterprise"
  }))
  default = []
}

locals {
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
  certificate_map_id = google_certificate_manager_certificate_map.main.name
  cloudflare_zone_id = var.cloudflare_zone_id
  tenant_name        = each.key
  create_gateway     = false

  labels = merge(local.common_labels, {
    tenant = each.key
    tier   = each.value.tier
  })

  depends_on = [
    google_container_cluster.primary,
    module.main_domain
  ]
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
  gke_cluster_id = google_container_cluster.primary.id

  depends_on = [google_container_cluster.primary]
}

# ========================================
# Outputs
# ========================================

output "tenant_domains" {
  value = {
    for name in keys(local.all_tenants) :
    name => "https://${name}.cloudappdev.site"
  }
}

output "enterprise_tenants" {
  value = {
    for name in keys(local.enterprise_tenants) :
    name => {
      domain    = "${name}.cloudappdev.site"
      namespace = name
    }
  }
}
