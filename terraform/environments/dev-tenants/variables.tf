variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
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

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
  default     = "ddbd47810ae075fc0bc55a4ef05a91ec"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

# ========================================
# Tenant Configuration
# ========================================

variable "tenants" {
  description = "List of tenants to provision"
  type = list(object({
    name = string # Tenant slug (e.g., "acme-corp")
    tier = string # "free", "standard", or "enterprise"
  }))
  default = []
}
