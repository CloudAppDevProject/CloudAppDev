# Cloudflare DNS Configuration
# This configuration is shared across all environments

data "cloudflare_zone" "zone" {
  zone_id = var.cloudflare_zone_id
}

# Note: Actual DNS records should be created per environment
# This module just provides shared resources

# Helper to look up zone name for string operations
locals {
  rr_name = (
    var.hostname == data.cloudflare_zone.zone.name ? "@"
    : replace(var.hostname, ".${data.cloudflare_zone.zone.name}", "")
  )
}

# Uncomment and configure as needed per environment:
# resource "cloudflare_dns_record" "lb_a" {
#   zone_id = var.cloudflare_zone_id
#   name    = local.rr_name
#   type    = "A"
#   content = var.lb_ip_address
#   ttl     = 300
#   proxied = false
# }
