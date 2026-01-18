# Database Outputs
output "database_instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = module.databases.instance_name
}

output "database_connection_name" {
  description = "The connection name of the Cloud SQL instance"
  value       = module.databases.instance_connection_name
}

output "database_username" {
  description = "The username for the Cloud SQL instance"
  value       = module.databases.user_name
}

# Storage Outputs
output "images_bucket_name" {
  description = "The name of the images storage bucket"
  value       = module.images_bucket.bucket_name
}

# Firestore Outputs
output "social_db_name" {
  description = "The name of the Firestore database"
  value       = module.social_db.database_name
}

# Service Account Outputs
output "social_service_account_email" {
  description = "Email of the social service account"
  value       = module.social_service_account.email
}

output "user_service_account_email" {
  description = "Email of the user service account"
  value       = module.user_service_account.email
}

output "user_service_account_member" {
  description = "IAM member string of the user service account"
  value       = module.user_service_account.member
}

output "itinerary_service_account_email" {
  description = "Email of the itinerary service account"
  value       = module.itinerary_service_account.email
}

output "all_service_accounts" {
  description = "Map of all service account emails for this deployment"
  value = {
    social    = module.social_service_account.email
    user      = module.user_service_account.email
    itinerary = module.itinerary_service_account.email
  }
}

output "all_service_account_member" {
  description = "IAM member string of the user service account"
  value       = {
    social    = module.social_service_account.member
    user      = module.user_service_account.member
    itinerary = module.itinerary_service_account.member
  }
}