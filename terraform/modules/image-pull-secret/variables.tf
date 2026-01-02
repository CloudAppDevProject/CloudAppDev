variable "service_account_email" {
  description = "Email of the GCP service account to use for pulling images"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace where the secret should be created"
  type        = string
  default     = "default"
}

variable "registry_url" {
  description = "URL of the Artifact Registry (e.g., europe-west1-docker.pkg.dev)"
  type        = string
}

variable "patch_default_sa" {
  description = "Whether to patch the default service account with the image pull secret"
  type        = bool
  default     = true
}