# ========================================
# Domain & Certificate Outputs
# ========================================

output "hostname" {
  description = "The actual domain registered (tenant.hostname or hostname)"
  value       = local.actual_domain
}

output "dns_authorization_id" {
  description = "ID of the DNS authorization resource"
  value       = google_certificate_manager_dns_authorization.domain.id
}

output "certificate_id" {
  description = "ID of the SSL certificate"
  value       = google_certificate_manager_certificate.domain.id
}

output "certificate_map_entry_id" {
  description = "ID of the certificate map entry"
  value       = google_certificate_manager_certificate_map_entry.domain.id
}

output "dns_validation_record" {
  description = "DNS validation record details"
  value = {
    name    = cloudflare_dns_record.cert_validation.name
    type    = cloudflare_dns_record.cert_validation.type
    content = cloudflare_dns_record.cert_validation.content
  }
}

output "certificate_status" {
  description = "Status of the certificate provisioning"
  value       = google_certificate_manager_certificate.domain.managed[0].provisioning_issue
}

# ========================================
# Kubernetes Gateway API Outputs
# ========================================

output "gateway_static_ip_name" {
  description = "Name of the reserved static IP resource"
  value       = var.create_static_ip ? google_compute_global_address.gateway_ip[0].name : null
}

output "gateway_ip" {
  description = "External IP address of the Gateway (pre-allocated static IP)"
  value       = var.create_static_ip ? google_compute_global_address.gateway_ip[0].address : null
}

output "gateway_name" {
  description = "Name of the Kubernetes Gateway resource"
  value       = var.create_gateway ? kubernetes_manifest.gateway[0].manifest.metadata.name : null
}

output "gateway_namespace" {
  description = "Namespace of the Kubernetes Gateway resource"
  value       = var.create_gateway ? kubernetes_manifest.gateway[0].manifest.metadata.namespace : null
}

output "gateway_class_name" {
  description = "Gateway class name used (gke-l7-global-external-managed)"
  value       = var.create_gateway ? "gke-l7-global-external-managed" : null
}

output "gateway_dns_record" {
  description = "DNS A record details for the gateway"
  value = var.create_gateway && var.create_static_ip ? {
    name    = cloudflare_dns_record.gateway[0].name
    content = cloudflare_dns_record.gateway[0].content
    proxied = cloudflare_dns_record.gateway[0].proxied
  } : null
}

output "gateway_url_http" {
  description = "HTTP URL to access the gateway"
  value       = var.create_gateway ? "http://${local.actual_domain}" : null
}

output "gateway_url_https" {
  description = "HTTPS URL to access the gateway (requires SSL certificate)"
  value       = var.create_gateway ? "https://${local.actual_domain}" : null
}
