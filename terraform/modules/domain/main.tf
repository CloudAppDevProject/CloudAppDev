locals {
  # If tenant_name is empty, use hostname as-is, otherwise prepend tenant_name
  actual_domain = var.tenant_name != "" ? "${var.tenant_name}.${var.hostname}" : var.hostname

  # Use tenant_name for resource naming, fallback to "main" if empty
  resource_prefix = var.tenant_name != "" ? var.tenant_name : "main"

  # Gateway name for Kubernetes resources
  gateway_name = "${local.resource_prefix}-gateway"
}

data "google_compute_global_address" "main_gateway_ip" {
  name = "main-gateway-ip"
}

# DNS Authorization for Certificate Manager
resource "google_certificate_manager_dns_authorization" "domain" {
  name        = "${local.resource_prefix}-dns-auth"
  description = "DNS authorization for ${local.actual_domain}"
  domain      = local.actual_domain

  labels = merge(
    var.labels,
    {
      tenant     = replace(local.resource_prefix, "-", "_")
      managed_by = "terraform"
    }
  )
}

# Create DNS validation record in Cloudflare
resource "cloudflare_dns_record" "cert_validation" {
  zone_id = var.cloudflare_zone_id
  # Strip trailing dot from FQDN for Cloudflare
  name    = trimsuffix(google_certificate_manager_dns_authorization.domain.dns_resource_record[0].name, ".")
  content = trimsuffix(google_certificate_manager_dns_authorization.domain.dns_resource_record[0].data, ".")
  type    = google_certificate_manager_dns_authorization.domain.dns_resource_record[0].type
  ttl     = var.dns_ttl
  proxied = false # Must be false for DNS validation
}

# Google-managed SSL Certificate (with DNS authorization)
resource "google_certificate_manager_certificate" "domain" {
  name        = "${local.resource_prefix}-cert"
  description = "Google-managed SSL certificate for ${local.actual_domain}"

  managed {
    domains            = [local.actual_domain]
    dns_authorizations = [google_certificate_manager_dns_authorization.domain.id]
  }

  labels = merge(
    var.labels,
    {
      tenant     = replace(local.resource_prefix, "-", "_")
      managed_by = "terraform"
    }
  )
}

# Certificate Map Entry - links certificate to the shared cert map
resource "google_certificate_manager_certificate_map_entry" "domain" {
  name         = "${local.resource_prefix}-cert-map-entry"
  description  = "Certificate map entry for ${local.actual_domain}"
  map          = var.certificate_map_id
  certificates = [google_certificate_manager_certificate.domain.id]
  hostname     = local.actual_domain

  labels = merge(
    var.labels,
    {
      tenant     = replace(local.resource_prefix, "-", "_")
      managed_by = "terraform"
    }
  )
}

# Note: Gateway resources have been moved to the environment's main.tf
# This module now only handles SSL certificates and DNS validation
# Cloudflare DNS A record pointing to the main Gateway IP
resource "cloudflare_dns_record" "main_gateway" {
  zone_id = var.cloudflare_zone_id
  name    = local.actual_domain
  content = data.google_compute_global_address.main_gateway_ip.address
  type    = "A"
  ttl     = 300
  proxied = false
}
