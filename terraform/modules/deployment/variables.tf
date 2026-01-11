variable "project_name" {
  description = "The name of the project."
  type        = string
}

variable "project_id" {
  description = "The ID of the project."
  type        = string
}

variable "namespace" {
  description = "The namespace for the Cloud SQL instance."
  type        = string
}

variable "region" {
  description = "The region where the Cloud SQL instance will be created."
  type        = string
}

variable "db_tier" {
  description = "The machine type for the Cloud SQL instance."
  type        = string
  default     = "db-f1-micro"
}

variable "gke_cluster_id" {
  description = "The ID of the GKE cluster (for service account dependencies)"
  type        = string
}
