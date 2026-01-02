output "secret_name" {
  description = "Name of the created Kubernetes secret"
  value       = kubernetes_secret_v1.artifact_registry.metadata[0].name
}

output "namespace" {
  description = "Namespace where the secret was created"
  value       = kubernetes_secret_v1.artifact_registry.metadata[0].namespace
}

output "service_account_key_id" {
  description = "ID of the service account key used"
  value       = google_service_account_key.registry_key.id
  sensitive   = true
}
