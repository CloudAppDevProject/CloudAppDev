# --- Databases & Buckets ---
output "users_db_connection_name" {
  description = "Users database connection name"
  value       = module.users_db.instance_connection_name
}

output "itinerary_db_connection_name" {
  description = "Itinerary database connection name"
  value       = module.itinerary_db.instance_connection_name
}

output "images_bucket_name" {
  description = "Images bucket name"
  value       = module.images_bucket.bucket_name
}

output "social_db_name" {
  description = "Social database name"
  value       = module.social_db.database_name
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

# --- Itinerary ---
output "itinerary_service_account_name" {
  description = "Itinerary service account name"
  value       = module.itinerary_service_account.name
}

output "itinerary_service_account_email" {
  description = "Itinerary service account email"
  value       = module.itinerary_service_account.email
}

# --- User ---
output "user_service_account_name" {
  description = "User service account name"
  value       = module.user_service_account.name
}

output "user_service_account_email" {
  description = "User service account email"
  value       = module.user_service_account.email
}

# --- Social ---
output "social_service_account_name" {
  description = "Social service account name"
  value       = module.social_service_account.name
}
output "social_service_account_email" {
  description = "Social service account email"
  value       = module.social_service_account.email
}

output "gke_cluster_name" {
  description = "GKE Cluster Name"
  value       = google_container_cluster.primary.name
}

# --- Certificate ---
output "dns_authorization_record" {
  description = "DNS authorization CNAME record (auto-created in Cloudflare)"
  value = {
    name = google_certificate_manager_dns_authorization.default.dns_resource_record[0].name
    type = google_certificate_manager_dns_authorization.default.dns_resource_record[0].type
    data = google_certificate_manager_dns_authorization.default.dns_resource_record[0].data
  }
}

output "certificate_name" {
  description = "Google-managed SSL certificate name"
  value       = google_certificate_manager_certificate.default.name
}

output "certificate_id" {
  description = "Google-managed SSL certificate ID"
  value       = google_certificate_manager_certificate.default.id
}

output "certificate_map_name" {
  description = "Certificate map name"
  value       = google_certificate_manager_certificate_map.default.name
}

output "certificate_map_id" {
  description = "Certificate map ID (use this in Gateway annotations)"
  value       = google_certificate_manager_certificate_map.default.id
}
