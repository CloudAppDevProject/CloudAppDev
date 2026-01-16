terraform {
  backend "gcs" {
    bucket = "cloudappdev-tf-state-dev"
    prefix = "env/dev-tenants"  # Separate state for tenant infrastructure
  }
}
