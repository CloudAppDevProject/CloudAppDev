variable "project" {
  description = "GCP project ID"
  type        = string
}

variable "database_name" {
  description = "Name of the Firestore database"
  type        = string
}

variable "region" {
  description = "GCP region for the database"
  type        = string
}

variable "database_edition" {
  description = "Database edition (ENTERPRISE or FIRESTORE_LITE)"
  type        = string
  default     = "ENTERPRISE"
}

variable "deletion_policy" {
  description = "Deletion policy (DELETE or ABANDON)"
  type        = string
  default     = "DELETE"
}
