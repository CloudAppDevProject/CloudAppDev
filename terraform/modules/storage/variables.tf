variable "bucket_name" {
  description = "Name of the storage bucket"
  type        = string
}

variable "region" {
  description = "GCP region for the bucket"
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion even when not empty"
  type        = bool
  default     = false
}

variable "hierarchical_namespace_enabled" {
  description = "Enable hierarchical namespace"
  type        = bool
  default     = true
}

variable "public_access_prevention" {
  description = "Public access prevention setting"
  type        = string
  default     = "enforced"
}

variable "uniform_bucket_level_access" {
  description = "Enable uniform bucket-level access"
  type        = bool
  default     = true
}

variable "versioning_enabled" {
  description = "Enable object versioning"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Labels to apply to the bucket"
  type        = map(string)
  default     = {}
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for the bucket"
  type = list(object({
    action = object({
      type          = string
      storage_class = optional(string)
    })
    condition = object({
      age = optional(number)
    })
  }))
  default = []
}
