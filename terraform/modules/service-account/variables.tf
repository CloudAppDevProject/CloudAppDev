variable "project" {
  description = "GCP project ID"
  type        = string
}

variable "account_id" {
  description = "Service account ID"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for Workload Identity bindings"
  type        = string
  default     = "default"
}

variable "display_name" {
  description = "Display name for the service account"
  type        = string
}

variable "key_rotation" {
  description = "Key rotation version (change to rotate keys)"
  type        = string
  default     = "v1"
}

variable "enable_cloudsql" {
  description = "Grant Cloud SQL permissions"
  type        = bool
  default     = false
}

variable "enable_storage" {
  description = "Grant Cloud Storage permissions"
  type        = bool
  default     = false
}

variable "enable_firestore" {
  description = "Grant Firestore permissions"
  type        = bool
  default     = false
}

variable "enable_artifact_registry" {
  description = "Grant Artifact Registry permissions"
  type        = bool
  default     = false
}

variable "k8s_service_accounts" {
  description = "List of Kubernetes service account names for Workload Identity binding"
  type        = list(string)
  default     = []
}

variable "enable_terraform_admin" {
  description = "Grant permissions for Terraform infrastructure management"
  type        = bool
  default     = false
}

variable "enable_secret_manager" {
  description = "Grant Secret Manager permissions"
  type        = bool
  default     = false
}
