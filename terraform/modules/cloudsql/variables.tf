variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "tier" {
  description = "Tenant tier (free, standard, enterprise) or direct machine tier (db-*)"
  type        = string
}

locals {
  # Map tenant tier names to actual Cloud SQL machine tiers
  tier_map = {
    free       = "db-f1-micro"      # Shared-core, 0.6 GB RAM (~$9/month)
    standard   = "db-g1-small"      # Shared-core, 1.7 GB RAM (~$26/month)
    enterprise = "db-custom-2-7680" # 2 vCPU, 7.5 GB RAM (~$100/month)
  }

  # Use mapped tier if it's a tenant tier name, otherwise use as-is (for direct db-* values)
  resolved_tier = lookup(local.tier_map, var.tier, var.tier)
}

variable "database_names" {
  description = "Names of the databases to create"
  type        = list(string)
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = false
}

variable "namespace" {
  description = "Namespace/environment label for the database (e.g., 'free', 'standard', 'default')"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
