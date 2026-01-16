variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "hostname" {
  description = "The base hostname (e.g., 'cloudappdev.site'). If tenant_name is provided, domain will be 'tenant.hostname', otherwise just 'hostname'"
  type        = string
}

variable "certificate_map_id" {
  description = "ID of the shared certificate map to add this certificate to"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for DNS validation"
  type        = string
}

variable "tenant_name" {
  description = "Optional tenant name. If empty, uses hostname as-is. If provided, prepends to hostname (e.g., 'free' -> 'free.hostname')"
  type        = string
  default     = ""
}

variable "labels" {
  description = "Additional labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "dns_ttl" {
  description = "TTL for DNS validation record"
  type        = number
  default     = 300
}

# Note: Gateway variables have been removed.
# Gateway resources are now managed directly in the environment's main.tf
