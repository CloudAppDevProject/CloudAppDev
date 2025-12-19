resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = var.database_version
  region           = var.region

  settings {
    tier    = var.tier
    edition = var.edition
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "user" {
  instance = google_sql_database_instance.instance.name
  name     = var.database_user
  password = var.database_password

  deletion_policy = "ABANDON"
}
