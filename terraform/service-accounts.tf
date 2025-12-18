
// ----------- SA Roles & Permissions -----------

// General purpose service account
resource "google_service_account" "run_sa" {
  account_id   = "run-exec"
  display_name = "Cloud Run Execution"
}


# // Allow public access if you want a public URL
//
// Uncomment for paas frontend
// 
# resource "google_cloud_run_service_iam_member" "invoker" {
#   location = google_cloud_run_v2_service.paas_frontend.location
#   service  = google_cloud_run_v2_service.paas_frontend.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

// Service Account key base 64 encoded
resource "google_service_account_key" "run_sa_key" {
  service_account_id = google_service_account.run_sa.name
  keepers = {
    # Change when a new value is needed
    rotation = "v1"
  }
}

// ----------- CLOUD SQL -----------
// Cloud SQL client permissions
resource "google_project_iam_member" "run_sa_cloudsql_client" {
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

// Create itinerary postgres database user
resource "google_sql_user" "itinerary_service_user" {
  instance = google_sql_database_instance.itinerary_postgress_db.name
  name     = local.POSTGRES_USER
  password = local.POSTGRES_PASSWORD

  deletion_policy = "ABANDON"
  depends_on = [ google_sql_database_instance.itinerary_postgress_db ]
}

// Create itinerary postgres database user
resource "google_sql_user" "users_service_user" {
  instance = google_sql_database_instance.users_postgress_db.name
  name     = local.POSTGRES_USER
  password = local.POSTGRES_PASSWORD

  deletion_policy = "ABANDON"
  depends_on = [ google_sql_database_instance.users_postgress_db ]
}

// Cloud SQL access permissions for SA
resource "google_project_iam_member" "run_sa_cloudsql_instance_user" {
  project = var.project
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

// Kubernetes -> Cloud SQL access permissions for SA
resource "google_service_account_iam_member" "run_sa_gke_binding" {
  service_account_id = google_service_account.run_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member  = "serviceAccount:${var.project}.svc.id.goog[default/cloudappdev-sa]"
}

resource "google_service_account_iam_member" "run_sa_gke_binding-itinerary" {
  service_account_id = google_service_account.run_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member  = "serviceAccount:${var.project}.svc.id.goog[default/itinerary-service-sa]"
}

resource "google_service_account_iam_member" "run_sa_gke_binding-user-service" {
  service_account_id = google_service_account.run_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member  = "serviceAccount:${var.project}.svc.id.goog[default/user-service-sa]"
}

resource "google_service_account_iam_member" "run_sa_gke_binding-social-service" {
  service_account_id = google_service_account.run_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member  = "serviceAccount:${var.project}.svc.id.goog[default/social-service-sa]"
}

// ----------- STORAGE BUCKET -----------
// Cloud storage bucket permissions
resource "google_project_iam_member" "run_sa_bucket" {
  project = var.project
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

// ----------- MONGODB & FIRESTORE -----------
// Firestore client permissions
resource "google_project_iam_member" "run_sa_firestore" {
  project = var.project
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

// Kubernetes Firestore permissions
resource "google_project_iam_member" "run_sa_firestore_indexer_admin" {
  project = var.project
  role    = "roles/datastore.indexAdmin"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

resource "google_firestore_user_creds" "firestore_user_creds" {
  project  = var.project
  database = google_firestore_database.social_nosql_db.name
  name     = google_service_account.run_sa.account_id
}
