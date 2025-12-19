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

output "service_account_email" {
  description = "Service account email"
  value       = module.app_service_account.service_account_email
}

output "gke_cluster_name" {
  description = "GKE Cluster Name"
  value       = google_container_cluster.primary.name
}
