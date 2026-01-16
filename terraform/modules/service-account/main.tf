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

# Artifact Registry Reader Role
resource "google_project_iam_member" "artifact_registry_reader" {
  count   = var.enable_artifact_registry ? 1 : 0
  project = var.project
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Terraform Admin Roles (for infrastructure provisioner)
# These roles allow the service account to manage tenant infrastructure via Terraform
resource "google_project_iam_member" "terraform_editor" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_member" "terraform_compute_admin" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/compute.admin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_member" "terraform_storage_admin" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_member" "terraform_sql_admin" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_member" "terraform_iam_admin" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/iam.serviceAccountAdmin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_member" "terraform_iam_creator" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/iam.serviceAccountKeyAdmin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Secret Manager Accessor Role
resource "google_project_iam_member" "secret_manager_accessor" {
  count   = var.enable_secret_manager ? 1 : 0
  project = var.project
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Firestore Admin Role (for Terraform provisioner)
resource "google_project_iam_member" "terraform_firestore_admin" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/datastore.owner"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Project IAM Admin Role (allows granting IAM permissions to other service accounts)
resource "google_project_iam_member" "terraform_project_iam_admin" {
  count   = var.enable_terraform_admin ? 1 : 0
  project = var.project
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

# Workload Identity Bindings for Kubernetes Service Accounts
resource "google_service_account_iam_member" "workload_identity" {
  for_each = toset(var.k8s_service_accounts)
  
  service_account_id = google_service_account.sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project}.svc.id.goog[${var.namespace}/${each.value}]"
}

resource "google_service_account_iam_member" "token_creator" {
  for_each = toset(var.k8s_service_accounts)
  service_account_id = google_service_account.sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.sa.email}"
}