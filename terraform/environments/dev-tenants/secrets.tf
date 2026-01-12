# ========================================
# Secrets from Google Secret Manager
# ========================================
# This file fetches secrets needed for tenant provisioning
# Secrets are stored in Google Secret Manager and accessed at runtime

data "google_secret_manager_secret_version" "cloudflare_api_token" {
  secret = "cloudflare_api_token"
}

# Local variables for easy access
locals {
  CLOUDFLARE_API_TOKEN = data.google_secret_manager_secret_version.cloudflare_api_token.secret_data
}
