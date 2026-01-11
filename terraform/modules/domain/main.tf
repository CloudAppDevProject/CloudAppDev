locals {
  # If tenant_name is empty, use hostname as-is, otherwise prepend tenant_name
  actual_domain = var.tenant_name != "" ? "${var.tenant_name}.${var.hostname}" : var.hostname

  # Use tenant_name for resource naming, fallback to "main" if empty
  resource_prefix = var.tenant_name != "" ? var.tenant_name : "main"

  # Gateway name for Kubernetes resources
  gateway_name = "${local.resource_prefix}-gateway"
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

# ========================================
# Kubernetes Gateway API Resources
# ========================================

# Reserve a global static external IP for the Gateway
# This IP is pre-allocated and assigned to the Gateway via annotation
resource "google_compute_global_address" "gateway_ip" {
  count = var.create_static_ip ? 1 : 0

  name        = "${local.resource_prefix}-gateway-ip"
  description = "Static external IP for ${local.gateway_name} Gateway"

  labels = merge(
    var.labels,
    {
      tenant     = replace(local.resource_prefix, "-", "_")
      managed_by = "terraform"
    }
  )
}

# External Gateway using Gateway API
# This creates a GCP Global External HTTP(S) Load Balancer
# The reserved static IP is assigned via annotation
resource "kubernetes_manifest" "gateway" {
  count = var.create_gateway ? 1 : 0

  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = local.gateway_name
      namespace = var.k8s_namespace

      labels = {
        app        = "api-gateway"
        tenant     = local.resource_prefix
        managed_by = "terraform"
      }

      # Annotations for static IP and certificate map
      annotations = merge(
        var.create_static_ip ? {
          "networking.gke.io/global-static-ip-name" = google_compute_global_address.gateway_ip[0].name
        } : {},
        {
          "networking.gke.io/certmap" = var.certificate_map_id
        }
      )
    }

    spec = {
      gatewayClassName = "gke-l7-global-external-managed"

      listeners = [
        {
          name     = "http"
          protocol = "HTTP"
          port     = 80
        },
        {
          name     = "https"
          protocol = "HTTPS"
          port     = 443
        }
      ]
    }
  }

  depends_on = [
    google_compute_global_address.gateway_ip
  ]
}


# Cloudflare DNS A record pointing to the Gateway IP
# Uses the pre-allocated static IP address (known before Gateway creation)
resource "cloudflare_dns_record" "gateway" {
  count = var.create_gateway && var.create_static_ip ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = local.actual_domain
  content = google_compute_global_address.gateway_ip[0].address
  type    = "A"
  ttl     = var.dns_ttl
  proxied = var.cloudflare_proxied

  depends_on = [
    kubernetes_manifest.gateway
  ]
}
