# Data sources for secrets
data "google_secret_manager_secret_version_access" "POSTGRES_PASSWORD" {
  secret = "db_password"
}

data "google_secret_manager_secret_version_access" "POSTGRES_USER" {
  secret = "postgres_user"
}

data "google_secret_manager_secret_version_access" "POSTGRES_NAME" {
  secret = "postgres_name"
}

data "google_secret_manager_secret_version_access" "CLOUDFLARE_API_TOKEN" {
  secret = "cloudflare_api_token"
}

data "google_secret_manager_secret_version_access" "FIREBASE_AUTH_KEY" {
  secret = "firebase_auth_key"
}

data "google_secret_manager_secret_version_access" "FIREBASE_AUTH_DOMAIN" {
  secret = "firebase_auth_domain"
}

data "google_secret_manager_secret_version_access" "FIREBASE_PROJECT_ID" {
  secret = "firebase_project_id"
}

data "google_secret_manager_secret_version_access" "FIREBASE_SERVICE_ACCOUNT" {
  secret = "firebase_service_account"
}

locals {
  POSTGRES_PASSWORD        = data.google_secret_manager_secret_version_access.POSTGRES_PASSWORD.secret_data
  POSTGRES_USER            = data.google_secret_manager_secret_version_access.POSTGRES_USER.secret_data
  POSTGRES_NAME            = data.google_secret_manager_secret_version_access.POSTGRES_NAME.secret_data
  CLOUDFLARE_API_TOKEN     = data.google_secret_manager_secret_version_access.CLOUDFLARE_API_TOKEN.secret_data
  FIREBASE_AUTH_KEY        = data.google_secret_manager_secret_version_access.FIREBASE_AUTH_KEY.secret_data
  FIREBASE_AUTH_DOMAIN     = data.google_secret_manager_secret_version_access.FIREBASE_AUTH_DOMAIN.secret_data
  FIREBASE_PROJECT_ID      = data.google_secret_manager_secret_version_access.FIREBASE_PROJECT_ID.secret_data
  FIREBASE_SERVICE_ACCOUNT = data.google_secret_manager_secret_version_access.FIREBASE_SERVICE_ACCOUNT.secret_data

  common_labels = {
    environment = var.environment
    managed_by  = "terraform"
    project     = var.project_name
  }
}
