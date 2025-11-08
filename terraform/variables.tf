variable "region" {
  default = "europe-west1"
}

variable "zone" {
  default = "europe-west1-c"
}

// Empty variable will prompt for the value on apply/plan
// unless set in `terraform.tfvars` file
variable "project" {

}

variable "project_name" {
  default = "cloudappdev"
}

variable "db_password" {

}

variable "db_user" {

}

variable "db_name" {

}

variable "node_env" {

}

variable "frontend_version" {

}

variable "mongodb_user" {

}

variable "firebase_service_account" {

}

variable "firebase_project_id" {

}

variable "firebase_auth_key" {

}

variable "firebase_auth_domain" {

}