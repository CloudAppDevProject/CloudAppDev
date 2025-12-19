# Google Cloud Storage Module

Creates a Google Cloud Storage bucket with configurable options.

## Features

- Hierarchical namespace support
- Public access prevention
- Uniform bucket-level access
- Optional versioning
- Lifecycle rules
- Custom labels

## Usage

```hcl
module "images_bucket" {
  source = "../../modules/storage"

  bucket_name  = "cloudappdev-dev-images"
  region       = "europe-west1"
  force_destroy = true

  labels = {
    environment = "dev"
    purpose     = "images"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| bucket_name | Bucket name | string | - | yes |
| region | GCP region | string | - | yes |
| force_destroy | Allow deletion when not empty | bool | false | no |
| hierarchical_namespace_enabled | Enable hierarchical namespace | bool | true | no |
| public_access_prevention | Public access setting | string | enforced | no |
| uniform_bucket_level_access | Enable uniform access | bool | true | no |
| versioning_enabled | Enable versioning | bool | false | no |
| labels | Bucket labels | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| bucket_name | Storage bucket name |
| bucket_url | Bucket URL |
| bucket_self_link | Bucket self link |
