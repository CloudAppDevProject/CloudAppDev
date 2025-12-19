resource "google_storage_bucket" "bucket" {
  name     = var.bucket_name
  location = var.region

  hierarchical_namespace {
    enabled = var.hierarchical_namespace_enabled
  }

  public_access_prevention    = var.public_access_prevention
  uniform_bucket_level_access = var.uniform_bucket_level_access
  force_destroy               = var.force_destroy

  labels = var.labels

  dynamic "versioning" {
    for_each = var.versioning_enabled ? [1] : []
    content {
      enabled = true
    }
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type          = lifecycle_rule.value.action.type
        storage_class = lookup(lifecycle_rule.value.action, "storage_class", null)
      }
      condition {
        age = lookup(lifecycle_rule.value.condition, "age", null)
      }
    }
  }
}
