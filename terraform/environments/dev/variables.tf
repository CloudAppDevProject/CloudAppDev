variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "europe-west1-c"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "cloudappdev"
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
  default     = "ddbd47810ae075fc0bc55a4ef05a91ec"
}

variable "hostname" {
  description = "Application hostname"
  type        = string
  default     = "dev.cloudappdev.site"
}

# GKE Configuration
variable "gke_num_nodes" {
  description = "Number of GKE nodes per zone"
  type        = number
  default     = 1
}

variable "gke_machine_type" {
  description = "GKE node machine type"
  type        = string
  default     = "e2-medium"
}

variable "gke_preemptible" {
  description = "Use preemptible nodes for cost savings"
  type        = bool
  default     = true
}
