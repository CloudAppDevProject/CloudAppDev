variable "region" {
  default = "europe-west6"
}

variable "zone" {
  default = "europe-west6-c"
}

// Empty variable will prompt for the value on apply/plan
// unless set in `terraform.tfvars` file
variable "project" {

}

variable "project_name" {
  default = "cloudappdev"
}


