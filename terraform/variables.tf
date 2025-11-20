variable "region" {
  default = "europe-west1"
}

variable "zone" {
  default = "europe-west1-c"
}

// Empty variable will prompt for the value on apply/plan
// unless set in `terraform.tfvars` file
variable "project" {
  description = "The GCS Project id"
}

variable "project_name" {
  default = "cloudappdev"
}

variable "node_env" {
  default = "production"
}

variable "frontend_version" {
  default = "latest"
}

variable "cloudflare_zone_id" {
  default = "ddbd47810ae075fc0bc55a4ef05a91ec"
}

variable "hostname" {
  default = "cloudappdev.site"
}

data "google_project" "project" {
}
