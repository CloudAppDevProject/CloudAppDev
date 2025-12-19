variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "hostname" {
  description = "Application hostname"
  type        = string
}

variable "lb_ip_address" {
  description = "Load balancer IP address for DNS record"
  type        = string
  default     = ""
}
