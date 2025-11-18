resource "google_cloud_run_v2_service" "paas_frontend" {
  name     = "${var.project_name}-paas-frontend"
  location = var.region

  template {
    service_account = google_service_account.run_sa.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project}/docker-repo/cloudappdev:${data.google_parameter_manager_parameter_version.FRONTEND_VERSION.parameter_data}"

      ports {
        container_port = 3000
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${local.POSTGRES_USER}:${local.POSTGRES_PASSWORD}@localhost/${local.POSTGRES_NAME}?host=/cloudsql/${google_sql_database_instance.postgress_db.connection_name}"
      }

      env {
        name  = "NODE_ENV"
        value = var.node_env
      }

      env {
        name  = "POSTGRES_USER"
        value = local.POSTGRES_USER
      }

      env {
        name  = "POSTGRES_PASSWORD"
        value = local.POSTGRES_PASSWORD
      }

      env {
        name  = "POSTGRES_DB"
        value = local.POSTGRES_NAME
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
        value = local.FIREBASE_PROJECT_ID
      }
      env {
        name  = "NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY"
        value = local.FIREBASE_AUTH_KEY
      }
      env {
        name  = "NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN"
        value = local.FIREBASE_AUTH_DOMAIN
      }
      env {
        name  = "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64"
        value = local.FIREBASE_SERVICE_ACCOUNT
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


// ----------- Databases & Buckets -----------
resource "google_sql_database_instance" "postgress_db" {
  name             = "${var.project_name}-tf-db"
  database_version = "POSTGRES_17"
  region           = var.region
  settings {
    tier    = "db-g1-small"
    edition = "ENTERPRISE"
  }
  deletion_protection = false

  depends_on = [google_project_iam_member.run_sa_cloudsql_client]
}


resource "google_storage_bucket" "images" {
  name     = "${var.project_name}-tf-images"
  location = var.region

  hierarchical_namespace {
    enabled = true
  }
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
  force_destroy               = true
}

resource "google_firestore_database" "no_sql_db" {
  project          = var.project
  name             = "${var.project_name}-tf-db2"
  location_id      = var.region
  type             = "FIRESTORE_NATIVE"
  database_edition = "ENTERPRISE"
  deletion_policy  = "DELETE"
}