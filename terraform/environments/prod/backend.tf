terraform {
  backend "gcs" {
    bucket = "cloudappdev-tf-state-prod"
    prefix = "env/prod"
  }
}
