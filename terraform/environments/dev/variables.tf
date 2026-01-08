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
