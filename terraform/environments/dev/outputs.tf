output "infrastructure" {
  description = "Tier-grouped infrastructure outputs"
  value = {
    free = {
      databases = {
        username        = module.free.database_username
        connection_name = module.free.database_connection_name
        social_db_name  = module.free.social_db_name
      }

      buckets = {
        images = module.free.images_bucket_name
      }

      service_accounts = module.free.all_service_accounts
    }

    standard = {
      databases = {
        connection_name = module.standard.database_connection_name
        social_db_name  = module.standard.social_db_name
        username        = module.standard.database_username
      }

      buckets = {
        images = module.standard.images_bucket_name
      }

      service_accounts = module.standard.all_service_accounts
    }

    tenant = {
      databases = {
        connection_name = module.default_databases.instance_connection_name
        username        = module.default_databases.user_name
      }

      service_account = {
        name  = module.tenant_service_account.name
        email = module.tenant_service_account.email
      }
    }

    app = {
      service_account = {
        name  = module.app_service_account.name
        email = module.app_service_account.email
      }
    }

    provisioner = {
      service_account = {
        name  = module.provisioning_service_account.name
        email = module.provisioning_service_account.email
      }
    }

    gke = {
      cluster_name = google_container_cluster.primary.name
    }

    certificate = {
      dns_record     = module.main_domain.dns_validation_record
      certificate_id = module.main_domain.certificate_id
      map = {
        name = google_certificate_manager_certificate_map.main.name
        id   = google_certificate_manager_certificate_map.main.id
      }
    }

    gateway = {
      name        = kubernetes_manifest.main_gateway.manifest.metadata.name
      namespace   = kubernetes_manifest.main_gateway.manifest.metadata.namespace
      static_ip   = google_compute_global_address.main_gateway_ip.address
      static_ip_name = google_compute_global_address.main_gateway_ip.name

      dns_record = {
        name    = cloudflare_dns_record.main_gateway.name
        content = cloudflare_dns_record.main_gateway.content
        proxied = cloudflare_dns_record.main_gateway.proxied
      }

      urls = {
        http  = "http://${var.hostname}"
        https = "https://${var.hostname}"
      }
    }
  }
}
