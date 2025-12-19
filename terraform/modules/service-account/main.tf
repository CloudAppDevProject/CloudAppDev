resource "google_service_account" "sa" {
  account_id   = var.account_id
  display_name = var.display_name
}

resource "google_service_account_key" "sa_key" {
  service_account_id = google_service_account.sa.name
  keepers = {
    rotation = var.key_rotation
  }
}

# Cloud SQL Client Role
resource "google_project_iam_member" "cloudsql_client" {
  count   = var.enable_cloudsql ? 1 : 0
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Cloud SQL Instance User Role
resource "google_project_iam_member" "cloudsql_instance_user" {
  count   = var.enable_cloudsql ? 1 : 0
  project = var.project
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Storage Object Admin Role
resource "google_project_iam_member" "storage_admin" {
  count   = var.enable_storage ? 1 : 0
  project = var.project
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Firestore/Datastore User Role
resource "google_project_iam_member" "firestore_user" {
  count   = var.enable_firestore ? 1 : 0
  project = var.project
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Firestore Index Admin Role
resource "google_project_iam_member" "firestore_index_admin" {
  count   = var.enable_firestore ? 1 : 0
  project = var.project
  role    = "roles/datastore.indexAdmin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Workload Identity Bindings for Kubernetes Service Accounts
resource "google_service_account_iam_member" "workload_identity" {
  for_each = toset(var.k8s_service_accounts)

  service_account_id = google_service_account.sa.name
  role               = "roles/iam.workloadIdentityUser"
  # TODO (): Make namespace configurable
  member             = "serviceAccount:${var.project}.svc.id.goog[default/${each.value}]"
}
