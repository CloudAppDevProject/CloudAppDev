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

output "member" {
  description = "The IAM member strings for all service account bindings"
  value       = { for k, v in google_service_account_iam_member.workload_identity : k => v.member }
}

