terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.9"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "cloudflare" {
  api_token = local.CLOUDFLARE_API_TOKEN
}

# Kubernetes provider - uses GKE cluster credentials
# Note: This will only work after the cluster is created
data "google_client_config" "default" {}

data "google_container_cluster" "primary" {
  name     = "${var.project_id}-cluster"
  location = var.region

  # This data source depends on the cluster being created first
  depends_on = [google_container_cluster.primary]
}

provider "kubernetes" {
  host  = "https://${data.google_container_cluster.primary.endpoint}"
  token = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(
    data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate,
  )
}
