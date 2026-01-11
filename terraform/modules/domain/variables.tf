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

# ========================================
# Kubernetes Gateway API Variables
# ========================================

variable "create_gateway" {
  description = "Whether to create Kubernetes Gateway resources (Gateway + DNS A record)"
  type        = bool
  default     = false
}

variable "k8s_namespace" {
  description = "Kubernetes namespace where the gateway will be created"
  type        = string
  default     = "default"
}

variable "create_static_ip" {
  description = "Whether to create a global static IP for the Gateway. Required when create_gateway is true."
  type        = bool
  default     = false
}

variable "cloudflare_proxied" {
  description = "Whether to proxy traffic through Cloudflare (orange cloud). Set false for direct access to GCP."
  type        = bool
  default     = false
}
