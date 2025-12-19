output "zone_name" {
  description = "Cloudflare zone name"
  value       = data.cloudflare_zone.zone.name
}

output "zone_id" {
  description = "Cloudflare zone ID"
  value       = data.cloudflare_zone.zone.zone_id
}
