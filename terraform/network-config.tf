resource "google_compute_network" "vpc_network" {
  name = "terraform-network"
}

# Helper to look up the CF zone name for the string operations above
data "cloudflare_zone" "zone" {
  zone_id = var.cloudflare_zone_id
}

# Name relative to zone (so "app" for app.example.com; "@" for apex)
locals {
  rr_name = (
    var.hostname == data.cloudflare_zone.zone.name ? "@"
    : replace(var.hostname, ".${data.cloudflare_zone.zone.name}", "")
  )
}

//
// Uncomment this to auto handle PAAS proxy, DNS and certificate handling
// 
# resource "cloudflare_dns_record" "lb_a" {
#   zone_id = var.cloudflare_zone_id
#   name    = local.rr_name
#   type    = "A"
#   content = google_compute_global_address.lb_ip.address
#   ttl     = 300
#   proxied = false

#   depends_on = [google_compute_global_forwarding_rule.fr_https]
# }

# # ---------- Serverless NEG that targets Cloud Run ----------
# resource "google_compute_region_network_endpoint_group" "run_neg" {
#   name                  = "neg-${google_cloud_run_v2_service.paas_frontend.name}"
#   region                = var.region
#   network_endpoint_type = "SERVERLESS"

#   cloud_run {
#     service = google_cloud_run_v2_service.paas_frontend.name
#     # optional: tag = "traffic-split-tag"
#   }
# }

# # ---------- Backend service using the NEG ----------
# resource "google_compute_backend_service" "be" {
#   name                  = "be-cloudrun"
#   protocol              = "HTTP"
#   load_balancing_scheme = "EXTERNAL_MANAGED" # Global External Application LB
#   timeout_sec           = 30

#   backend {
#     group = google_compute_region_network_endpoint_group.run_neg.id
#   }
# }

# # ---------- URL map (all traffic to backend; add path rules if needed) ----------
# resource "google_compute_url_map" "urlmap" {
#   name            = "urlmap-cloudrun"
#   default_service = google_compute_backend_service.be.id
# }

# # ---------- Google-managed cert for your hostname ----------
# resource "google_compute_managed_ssl_certificate" "cert" {
#   name = "cert-${replace(var.hostname, ".", "-")}"
#   managed {
#     domains = [var.hostname]
#   }
# }

# # ---------- HTTPS proxy ----------
# resource "google_compute_target_https_proxy" "https_proxy" {
#   name             = "https-proxy-cloudrun"
#   url_map          = google_compute_url_map.urlmap.id
#   ssl_certificates = [google_compute_managed_ssl_certificate.cert.id]

#   depends_on = [google_compute_managed_ssl_certificate.cert]
# }

# # ---------- Static global IP (v4) ----------
# resource "google_compute_global_address" "lb_ip" {
#   name       = "lb-ipv4"
#   ip_version = "IPV4"
# }

# # ---------- Global forwarding rule on 443 ----------
# resource "google_compute_global_forwarding_rule" "fr_https" {
#   name                  = "fr-https"
#   ip_protocol           = "TCP"
#   port_range            = "443"
#   target                = google_compute_target_https_proxy.https_proxy.id
#   load_balancing_scheme = "EXTERNAL_MANAGED"
#   ip_address            = google_compute_global_address.lb_ip.address

#   depends_on = [
#     google_compute_target_https_proxy.https_proxy,
#     google_compute_global_address.lb_ip
#   ]
# }

