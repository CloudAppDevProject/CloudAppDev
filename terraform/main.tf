terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.9.0"
    }
  }
}

provider "google" {
  project = var.project
  region  = var.region
  zone    = var.zone
}

resource "google_compute_network" "vpc_network" {
  name = "terraform-network"
}

resource "google_compute_instance" "vm_instance" {
  name         = "${var.project_name}-iaas-frontend"
  machine_type = "f1-micro"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = google_compute_network.vpc_network.name
    // Empty access_config leads to public IP being created
    access_config {
    }
  }
}

resource "google_cloud_run_service" "paas_frontend" {
  name     = "${var.project_name}-paas-frontend"
  location = var.region

  template {
    spec {
      containers {
        image = "us-docker.pkg.dev/cloudrun/container/hello"
      }
    }
  }
}

resource "google_sql_database_instance" "postgress_db" {
  name             = "${var.project_name}-tf-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = "db-g1-small"
    edition = "ENTERPRISE"
  }
}

resource "google_storage_bucket" "images" {
  name = "${var.project_name}-tf-images"
  location = var.region

  hierarchical_namespace {
    enabled = true
  }
  public_access_prevention = "enforced"
  uniform_bucket_level_access = true
}

resource "google_firestore_database" "no_sql_db" {
  project          = var.project
  name             = "${var.project_name}-tf-db2"
  location_id      = var.region
  type             = "FIRESTORE_NATIVE"
  database_edition = "ENTERPRISE"
}
