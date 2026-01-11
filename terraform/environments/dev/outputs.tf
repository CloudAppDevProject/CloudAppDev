# --- Databases & Buckets ---
# Free Tier
output "free_db_connection_name" {
  description = "Free tier database connection name"
  value       = module.free.database_connection_name
}

output "free_images_bucket_name" {
  description = "Free tier images bucket name"
  value       = module.free.images_bucket_name
}

output "free_social_db_name" {
  description = "Free tier social database name"
  value       = module.free.social_db_name
}

# Standard Tier
output "standard_db_connection_name" {
  description = "Standard tier database connection name"
  value       = module.standard.database_connection_name
}

output "standard_images_bucket_name" {
  description = "Standard tier images bucket name"
  value       = module.standard.images_bucket_name
}

output "standard_social_db_name" {
  description = "Standard tier social database name"
  value       = module.standard.social_db_name
}

# Default (Tenant DB only)
output "tenant_db_connection_name" {
  description = "Tenant database connection name"
  value       = module.default_databases.instance_connection_name
}

# --- App ---
output "app_service_account_name" {
  description = "Service account name"
  value       = module.app_service_account.name
}

output "app_service_account_email" {
  description = "Service account email"
  value       = module.app_service_account.email
}

# --- Service Accounts (Free Tier) ---
output "free_service_accounts" {
  description = "Free tier service account emails"
  value       = module.free.all_service_accounts
}

# --- Service Accounts (Standard Tier) ---
output "standard_service_accounts" {
  description = "Standard tier service account emails"
  value       = module.standard.all_service_accounts
}

# --- Tenant ---
output "tenant_service_account_name" {
  description = "Tenant service account name"
  value       = module.tenant_service_account.name
}
output "tenant_service_account_email" {
  description = "Tenant service account email"
  value       = module.tenant_service_account.email
}

output "gke_cluster_name" {
  description = "GKE Cluster Name"
  value       = google_container_cluster.primary.name
}

# --- Certificate ---
output "dns_authorization_record" {
  description = "Main domain DNS authorization CNAME record (auto-created in Cloudflare)"
  value       = module.main_domain.dns_validation_record
}

output "certificate_id" {
  description = "Main domain SSL certificate ID"
  value       = module.main_domain.certificate_id
}

output "certificate_map_name" {
  description = "Certificate map name (shared across all domains)"
  value       = google_certificate_manager_certificate_map.main.name
}

output "certificate_map_id" {
  description = "Certificate map ID (use this in Gateway annotations)"
  value       = google_certificate_manager_certificate_map.main.id
}
