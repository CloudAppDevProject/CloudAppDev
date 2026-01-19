# ========================================
# Tenant Infrastructure Outputs
# ========================================

output "tenant_domains" {
  description = "All tenant domains (subdomain URLs)"
  value = {
    for name in keys(local.all_tenants) :
    name => "https://${name}.cloudappdev.site"
  }
}

output "enterprise_tenants" {
  description = "Enterprise tenant details with dedicated namespaces"
  value = {
    for name in keys(local.enterprise_tenants) :
    name => {
      domain    = "${name}.cloudappdev.site"
      namespace = name
      tier      = "enterprise"
    }
  }
}

output "free_tenants" {
  description = "Free tier tenants (shared namespace)"
  value = {
    for name, tenant in local.all_tenants :
    name => {
      domain    = "${name}.cloudappdev.site"
      namespace = "free"
      tier      = tenant.tier
    }
    if tenant.tier == "free"
  }
}

output "standard_tenants" {
  description = "Standard tier tenants (shared namespace)"
  value = {
    for name, tenant in local.all_tenants :
    name => {
      domain    = "${name}.cloudappdev.site"
      namespace = "standard"
      tier      = tenant.tier
    }
    if tenant.tier == "standard"
  }
}

output "tenant_count" {
  description = "Total number of provisioned tenants"
  value = {
    total      = length(local.all_tenants)
    free       = length([for t in var.tenants : t if t.tier == "free"])
    standard   = length([for t in var.tenants : t if t.tier == "standard"])
    enterprise = length(local.enterprise_tenants)
  }
}

# ========================================
# Enterprise Deployment Outputs
# ========================================

output "enterprise_deployments" {
  description = "Detailed infrastructure for each enterprise tenant"
  value = {
    for name in keys(local.enterprise_tenants) :
    name => {
      namespace                      = name
      database_instance_name         = module.enterprise_namespace[name].database_instance_name
      database_connection_name       = module.enterprise_namespace[name].database_connection_name
      images_bucket_name             = module.enterprise_namespace[name].images_bucket_name
      social_db_name                 = module.enterprise_namespace[name].social_db_name
      user_service_account_email     = module.enterprise_namespace[name].user_service_account_email
      itinerary_service_account_email = module.enterprise_namespace[name].itinerary_service_account_email
      social_service_account_email   = module.enterprise_namespace[name].social_service_account_email
      user_service_account_key     = module.enterprise_namespace[name].user_service_account_key
      itinerary_service_account_key = module.enterprise_namespace[name].itinerary_service_account_key
      social_service_account_key   = module.enterprise_namespace[name].social_service_account_key
    }
  }
}
