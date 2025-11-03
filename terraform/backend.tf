terraform {
  backend "gcs" {
    bucket = "cloudappdev-tf-state"
    prefix = "single/network"
  }
}