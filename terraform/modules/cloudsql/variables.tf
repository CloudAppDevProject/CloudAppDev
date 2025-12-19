variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_17"
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "tier" {
  description = "Machine tier for the instance"
  type        = string
}

variable "edition" {
  description = "Database edition (ENTERPRISE or ENTERPRISE_PLUS)"
  type        = string
  default     = "ENTERPRISE"
}

variable "database_name" {
  description = "Name of the database to create"
  type        = string
}

variable "database_user" {
  description = "Database user name"
  type        = string
}

variable "database_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = false
}
