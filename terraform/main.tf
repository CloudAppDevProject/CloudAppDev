// ----------- Databases & Buckets -----------
resource "google_sql_database_instance" "itinerary_postgress_db" {
  name             = "${var.project_name}-tf-itinerary-db"
  database_version = "POSTGRES_17"
  region           = var.region
  settings {
    tier    = "db-g1-small"
    edition = "ENTERPRISE"
  }
  deletion_protection = false

  depends_on = [google_project_iam_member.run_sa_cloudsql_client]
}

resource "google_sql_database" "itinerary_postgress_db_database" {
  name = local.POSTGRES_NAME
  instance= google_sql_database_instance.itinerary_postgress_db.name
}

resource "google_sql_database_instance" "users_postgress_db" {
  name             = "${var.project_name}-tf-users-db"
  database_version = "POSTGRES_17"
  region           = var.region
  settings {
    tier    = "db-g1-small"
    edition = "ENTERPRISE"
  }
  deletion_protection = false

  depends_on = [google_project_iam_member.run_sa_cloudsql_client]
}

resource "google_sql_database" "users_postgress_db_database" {
  name = local.POSTGRES_NAME
  instance= google_sql_database_instance.users_postgress_db.name
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

resource "google_firestore_database" "social_nosql_db" {
  project          = var.project
  name             = "${var.project_name}-tf-social-db"
  location_id      = var.region
  type             = "FIRESTORE_NATIVE"
  database_edition = "ENTERPRISE"
  deletion_policy  = "DELETE"
}