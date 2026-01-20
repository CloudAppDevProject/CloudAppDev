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

variable "tier" {
  description = "The tenant tier (free, standard, enterprise) - determines resource allocation"
  type        = string
  default     = "free"
  validation {
    condition     = contains(["free", "standard", "enterprise"], var.tier)
    error_message = "Tier must be one of: free, standard, enterprise"
  }
}

variable "gke_cluster_id" {
  description = "The ID of the GKE cluster (for service account dependencies)"
  type        = string
}

# ========================================
# Tier-based Resource Configuration
# ========================================

locals {
  # Database tier mapping based on tenant tier
  # Free: Cheapest option, shared resources, minimal performance (~$9/month)
  # Standard: Better performance, still cost-effective (~$26/month)
  # Enterprise: Dedicated resources, high performance (~$100/month)
  tier_db_config = {
    free = {
      db_tier                = "db-f1-micro"      # Shared-core, 0.6 GB RAM
      deletion_protection    = false
      backup_enabled         = false
      point_in_time_recovery = false
    }
    standard = {
      db_tier                = "db-g1-small"      # Shared-core, 1.7 GB RAM
      deletion_protection    = false
      backup_enabled         = false
      point_in_time_recovery = false
    }
    enterprise = {
      db_tier                = "db-custom-2-7680" # 2 vCPU, 7.5 GB RAM
      deletion_protection    = false
      backup_enabled         = false
      point_in_time_recovery = false
    }
  }

  # Get configuration for current tier
  db_config = local.tier_db_config[var.tier]
}
