output "service_account_email" {
  description = "The email address of the service account"
  value       = google_service_account.sa.email
}

output "service_account_name" {
  description = "The name of the service account"
  value       = google_service_account.sa.name
}

output "service_account_key" {
  description = "The service account key (base64 encoded)"
  value       = google_service_account_key.sa_key.private_key
  sensitive   = true
}
