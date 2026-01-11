resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier    = var.tier
    edition = "ENTERPRISE"
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "database" {
  for_each = toset(var.database_names)
  name     = each.value
  instance = google_sql_database_instance.instance.name
  deletion_policy = var.deletion_protection ? "RETAIN" : "DELETE"
}

resource "random_password" "db_passwords" {
  for_each = toset(var.database_names)
  length   = 32
  special  = true
}

resource "google_sql_user" "user" {
  for_each = toset(var.database_names)
  instance = google_sql_database_instance.instance.name
  name     = each.value
  password = random_password.db_passwords[each.key].result

  deletion_policy = "ABANDON"
}

resource "google_secret_manager_secret" "db_password" {
  for_each = toset(var.database_names)
  project   = google_sql_database_instance.instance.project
  secret_id = "${var.namespace}-${each.value}-password"

  labels = merge(
    var.labels,
    {
      type      = "database_password"
    }
  )

  replication {
    auto {}
  }

  deletion_protection = var.deletion_protection
}

resource "google_secret_manager_secret_version" "db_password_version" {
  for_each   = toset(var.database_names)
  secret      = google_secret_manager_secret.db_password[each.key].name
  secret_data = random_password.db_passwords[each.key].result
}
