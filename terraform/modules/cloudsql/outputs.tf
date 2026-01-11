output "instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.name
}

output "instance_connection_name" {
  description = "The connection name of the instance (project:region:instance)"
  value       = google_sql_database_instance.instance.connection_name
}

output "database_names" {
  description = "Map of database names"
  value       = { for db in google_sql_database.database : db.name => db.name }
}

output "instance_self_link" {
  description = "The URI of the instance"
  value       = google_sql_database_instance.instance.self_link
}

output "instance_id" {
  description = "The ID of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.id
}
