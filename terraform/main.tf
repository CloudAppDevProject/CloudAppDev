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

resource "google_cloud_run_v2_service" "paas_frontend" {
  name     = "${var.project_name}-paas-frontend"
  location = var.region

  template {
    service_account = google_service_account.run_sa.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project}/docker-repo/cloudappdev:${var.frontend_version}"

      ports {
        container_port = 3000
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:${var.db_password}@localhost/${var.db_name}?host=/cloudsql/${google_sql_database_instance.postgress_db.connection_name}"
      }

      env {
        name  = "NODE_ENV"
        value = var.node_env
      }

      env {
        name  = "POSTGRES_USER"
        value = var.db_user
      }

      env {
        name  = "POSTGRES_PASSWORD"
        value = var.db_password
      }

      env {
        name  = "POSTGRES_DB"
        value = var.db_name
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT_ID"
        value = var.project
      }

      env {
        name  = "GOOGLE_CLOUD_STORAGE_BUCKET"
        value = google_storage_bucket.images.name
      }

      env {
        name  = "GOOGLE_CLOUD_CREDENTIALS_BASE64"
        value = google_service_account_key.run_sa_key.private_key
      }

      env {
        name  = "MONGODB_URI"
        value = "mongodb://${google_firestore_user_creds.firestore_user_creds.name}:${google_firestore_user_creds.firestore_user_creds.secure_password}@${google_firestore_database.no_sql_db.uid}.${var.region}.firestore.goog:443/${google_firestore_database.no_sql_db.name}?loadBalanced=true&tls=true&retryWrites=false"
      }

      env {
        name  = "MONGO_INITDB_DATABASE"
        value = google_firestore_database.no_sql_db.name
      }
      env {
        name  = "NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID"
        value = var.firebase_project_id
      }
      env {
        name  = "NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY"
        value = var.firebase_auth_key
      }
      env {
        name  = "NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN"
        value = var.firebase_auth_domain
      }
      env {
        name  = "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64"
        value = var.firebase_service_account
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
    
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [
          google_sql_database_instance.postgress_db.connection_name
        ]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  deletion_protection = false
}

// ----------- SA Roles & Permissions -----------
resource "google_service_account" "run_sa" {
  account_id   = "run-exec"
  display_name = "Cloud Run Execution"
}

resource "google_project_iam_member" "run_sa_cloudsql_client" {
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

resource "google_project_iam_member" "run_sa_firestore" {
  project = var.project
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

resource "google_project_iam_member" "run_sa_bucket" {
  project = var.project
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

# Allow public access if you want a public URL
resource "google_cloud_run_service_iam_member" "invoker" {
  location = google_cloud_run_v2_service.paas_frontend.location
  service  = google_cloud_run_v2_service.paas_frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_firestore_user_creds" "firestore_user_creds" {
  project  = var.project
  database = google_firestore_database.no_sql_db.name
  name     = google_service_account.run_sa.account_id
}


resource "google_service_account_key" "run_sa_key" {
  service_account_id = google_service_account.run_sa.name
  keepers = {
    # Change when a new value is needed
    rotation = "v1"
  }
}

// ----------- Databases & Buckets -----------
resource "google_sql_database_instance" "postgress_db" {
  name             = "${var.project_name}-tf-db"
  database_version = "POSTGRES_16"
  region           = var.region
  settings {
    tier    = "db-g1-small"
    edition = "ENTERPRISE"
  }
  deletion_protection = false
}

resource "google_sql_user" "app_user" {
  instance = google_sql_database_instance.postgress_db.name
  name     = var.db_user
  password = var.db_password
}

resource "google_storage_bucket" "images" {
  name     = "${var.project_name}-tf-images"
  location = var.region

  hierarchical_namespace {
    enabled = true
  }
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
}

resource "google_firestore_database" "no_sql_db" {
  project          = var.project
  name             = "${var.project_name}-tf-db2"
  location_id      = var.region
  type             = "FIRESTORE_NATIVE"
  database_edition = "ENTERPRISE"
}
