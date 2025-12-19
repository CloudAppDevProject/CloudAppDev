resource "google_firestore_database" "database" {
  project     = var.project
  name        = var.database_name
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  database_edition = var.database_edition
  deletion_policy  = var.deletion_policy
}
