output "email" {
  description = "The email address of the service account"
  value       = google_service_account.sa.email
}

output "name" {
  description = "The name of the service account"
  value       = google_service_account.sa.account_id
}

output "key" {
  description = "The service account key (base64 encoded)"
  value       = google_service_account_key.sa_key.private_key
  sensitive   = true
}
