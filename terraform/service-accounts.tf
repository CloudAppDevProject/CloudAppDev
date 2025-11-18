
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


resource "google_sql_user" "app_user" {
  instance = google_sql_database_instance.postgress_db.name
  name     = local.POSTGRES_USER
  password = local.POSTGRES_PASSWORD

  deletion_policy = "ABANDON"
}