################################################################################
# Kubernetes Image Pull Secret Module
# Creates a docker-registry secret for pulling images from Artifact Registry
################################################################################

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

# Create service account key for image pulling
resource "google_service_account_key" "registry_key" {
  service_account_id = var.service_account_email
}

# Create Kubernetes secret for image pulling
resource "kubernetes_secret_v1" "artifact_registry" {
  metadata {
    name      = "artifact-registry"
    namespace = var.namespace
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "${var.registry_url}" = {
          username = "_json_key"
          password = base64decode(google_service_account_key.registry_key.private_key)
          email    = var.service_account_email
          auth     = base64encode("_json_key:${base64decode(google_service_account_key.registry_key.private_key)}")
        }
      }
    })
  }
}

# Patch default service account to use the secret
# Note: Using kubernetes_default_service_account_v1 to patch existing default SA
resource "kubernetes_default_service_account_v1" "default" {
  count = var.patch_default_sa ? 1 : 0

  metadata {
    namespace = var.namespace
  }

  image_pull_secret {
    name = kubernetes_secret_v1.artifact_registry.metadata[0].name
  }
}
