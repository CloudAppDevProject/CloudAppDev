output "instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.name
}

output "instance_connection_name" {
  description = "The connection name of the instance (project:region:instance)"
  value       = google_sql_database_instance.instance.connection_name
}

output "database_name" {
  description = "The name of the database"
  value       = google_sql_database.database.name
}

output "instance_self_link" {
  description = "The URI of the instance"
  value       = google_sql_database_instance.instance.self_link
}
