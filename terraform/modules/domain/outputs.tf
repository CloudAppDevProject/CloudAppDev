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

# DNS A Record outputs for the main gateway
output "dns_record_name" {
  description = "Name of the DNS A record for the gateway"
  value       = cloudflare_dns_record.main_gateway.name
}

output "dns_record_content" {
  description = "IP address content of the DNS A record"
  value       = cloudflare_dns_record.main_gateway.content
}

output "dns_record_proxied" {
  description = "Whether the DNS record is proxied through Cloudflare"
  value       = cloudflare_dns_record.main_gateway.proxied
}
