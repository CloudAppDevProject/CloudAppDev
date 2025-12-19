terraform {
  backend "gcs" {
    bucket = "cloudappdev-tf-state-dev"
    prefix = "env/dev"
  }
}
