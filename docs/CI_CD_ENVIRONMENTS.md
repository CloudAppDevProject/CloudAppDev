# CI/CD Multi-Environment Setup

This document describes the multi-environment CI/CD pipeline configuration for CloudAppDev project.

## Overview

The CI/CD pipeline supports two separate environments with dedicated workflows:
- **Development (dev)** - Auto-incrementing versions, triggered by pushes to `develop` branch
- **Production (prod)** - Git tag-based versions, triggered by pushes to `master` branch with tags

Each environment has its own workflow files and pushes to separate GCP projects with isolated Artifact Registry repositories.

## Versioning Strategy

### Development (Auto-Increment)
- **Version Format:** `0.0.X` where X is the GitHub Actions run number
- **Automatic:** No manual intervention needed
- **Example:** `0.0.42`, `0.0.43`, `0.0.44`
- **Use Case:** Continuous integration, testing, and development

### Production (Git Tags)
- **Version Format:** Semantic versioning from git tags (e.g., `1.0.0`, `2.1.3`)
- **Manual:** Requires creating git tag before push
- **Example:** `v1.0.0` → Docker image tagged `1.0.0` and `1.0`
- **Use Case:** Controlled releases with explicit versioning

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                        │
│                                                             │
│  ┌──────────────┐              ┌──────────────┐           │
│  │   develop    │              │    master    │           │
│  │   branch     │              │    branch    │           │
│  └──────┬───────┘              └──────┬───────┘           │
│         │                              │                   │
└─────────┼──────────────────────────────┼───────────────────┘
          │                              │
          │ Push                         │ Push (PR merge)
          ▼                              ▼
┌─────────────────────┐        ┌─────────────────────┐
│  GitHub Actions     │        │  GitHub Actions     │
│  (Dev Workflow)     │        │  (Prod Workflow)    │
└─────────┬───────────┘        └─────────┬───────────┘
          │                              │
          │ Build & Push                 │ Build & Push
          ▼                              ▼
┌─────────────────────┐        ┌─────────────────────┐
│  GCP Dev Project    │        │  GCP Prod Project   │
│                     │        │                     │
│  Artifact Registry: │        │  Artifact Registry: │
│  docker-repo        │        │  docker-repo        │
│                     │        │                     │
│  Images:            │        │  Images:            │
│  • frontend         │        │  • frontend         │
│  • user-service     │        │  • user-service     │
│  • itinerary-srv    │        │  • itinerary-srv    │
│  • social-service   │        │  • social-service   │
│  • travel-info-srv  │        │  • travel-info-srv  │
│  • api-gateway      │        │  • api-gateway      │
│  • seeder           │        │  • seeder           │
└─────────────────────┘        └─────────────────────┘
```

## Workflows

The CI/CD system uses **separate workflow files** for each environment to simplify logic and improve maintainability.

### Development Workflows

#### 1. Multi-Service Dev Build
**File:** `.github/workflows/build-and-push-dev.yml`

**Features:**
- Auto-incrementing version numbers (`0.0.X`)
- Detects changed services and builds only those
- Smart caching with GitHub Actions cache
- Parallel service builds
- No git tags required

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Version Tags:**
  - `latest` (always updated)
  - `0.0.42` (auto-incremented from run number)
  - `sha-abc1234` (git commit SHA)

#### 2. Seeder Dev Build
**File:** `.github/workflows/build-and-push-seeder-dev.yml`

**Features:**
- Auto-incrementing version numbers
- Builds unified database seeder for Kubernetes

**Triggers:**
- Push to `develop` with changes to:
  - `services/seeder/**`
  - `seed-data/**`
  - Prisma schemas

### Production Workflows

#### 3. Multi-Service Prod Build
**File:** `.github/workflows/build-and-push-prod.yml`

**Features:**
- Version from git tags (e.g., `v1.0.0`)
- Requires git tag to exist before build
- Detects changed services and builds only those
- Creates semantic version tags (major.minor)
- Parallel service builds

**Triggers:**
- Push of tags matching `*.*.*` or `v*.*.*` (e.g., `1.0.0` or `v1.0.0`)
- Manual workflow dispatch

**Version Tags:**
  - `latest` (always updated)
  - `1.0.0` (from git tag `v1.0.0`)
  - `1.0` (major.minor extracted from tag)
  - `sha-abc1234` (git commit SHA)

**Important:** Production builds will **fail** if no git tag is found!

#### 4. Seeder Prod Build
**File:** `.github/workflows/build-and-push-seeder-prod.yml`

**Features:**
- Version from git tags
- Requires git tag before build
- Creates semantic version tags

**Triggers:**
- Push of tags matching `*.*.*` or `v*.*.*`

## GitHub Secrets Configuration

### Required Secrets

You must configure the following secrets in your GitHub repository:

#### Development Environment
```
GCP_PROJECT_ID_DEV       # GCP Project ID for development
GCP_SA_KEY_DEV           # Service Account JSON key for dev project
```

#### Production Environment
```
GCP_PROJECT_ID_PROD      # GCP Project ID for production
GCP_SA_KEY_PROD          # Service Account JSON key for prod project
```

### How to Set Up Secrets

1. **Navigate to GitHub Repository Settings:**
   ```
   Your Repo → Settings → Secrets and variables → Actions
   ```

2. **Click "New repository secret"**

3. **Add each secret with the exact names above**

### Generating Service Account Keys

For each GCP project (dev and prod):

1. **Create Service Account:**
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions CI/CD" \
     --project=<PROJECT_ID>
   ```

2. **Grant Permissions:**
   ```bash
   # Artifact Registry Writer
   gcloud projects add-iam-policy-binding <PROJECT_ID> \
     --member="serviceAccount:github-actions@<PROJECT_ID>.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"

   # Storage Admin (for caching)
   gcloud projects add-iam-policy-binding <PROJECT_ID> \
     --member="serviceAccount:github-actions@<PROJECT_ID>.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   ```

3. **Create JSON Key:**
   ```bash
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=github-actions@<PROJECT_ID>.iam.gserviceaccount.com
   ```

4. **Copy JSON Content:**
   ```bash
   cat github-actions-key.json
   # Copy entire JSON output
   ```

5. **Add to GitHub Secrets:**
   - Paste the entire JSON as the secret value
   - **Important:** Paste the raw JSON, not base64 encoded

6. **Delete Local Key File (Security):**
   ```bash
   rm github-actions-key.json
   ```

### Verify Secrets Are Set

Run this in your repository to check (won't show values):
```bash
gh secret list
```

Expected output:
```
GCP_PROJECT_ID_DEV
GCP_PROJECT_ID_PROD
GCP_SA_KEY_DEV
GCP_SA_KEY_PROD
```

## GCP Artifact Registry Setup

### Create Repositories in Both Projects

For **Dev Project:**
```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Development Docker images" \
  --project=<DEV_PROJECT_ID>
```

For **Prod Project:**
```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Production Docker images" \
  --project=<PROD_PROJECT_ID>
```

### Verify Repositories Exist

```bash
# Dev
gcloud artifacts repositories list --project=<DEV_PROJECT_ID>

# Prod
gcloud artifacts repositories list --project=<PROD_PROJECT_ID>
```

## Workflow Behavior

### Development Workflow (develop branch)

1. **Developer pushes to `develop` branch**
2. **Dev workflow triggered** (`.github/workflows/build-and-push-dev.yml`)
3. **Version auto-generated:** `0.0.{run_number}` (e.g., `0.0.42`)
4. **Detects changed services** in the commit
5. **Builds changed services** in parallel
6. **Tags images** with:
   - `latest`
   - `0.0.42` (version)
   - `sha-abc1234` (commit SHA)
7. **Pushes to Dev GCP Project** Artifact Registry
8. **Summary shows:** Environment (dev), version, built services

**No manual steps required!** Just push to develop.

### Production Workflow (Tag-based)

**Trigger:** Pushing a semantic version tag

1. **Developer merges to master and creates git tag:**
   ```bash
   git checkout master
   git pull origin master
   git tag v1.0.0  # or simply: git tag 1.0.0
   ```

2. **Push tag to trigger production build:**
   ```bash
   git push origin v1.0.0
   # or push all tags: git push origin --tags
   ```

3. **Prod workflow triggered** (`.github/workflows/build-and-push-prod.yml`)
4. **Workflow reads git tag:** `v1.0.0` (or `1.0.0`)
5. **Extracts version:** `1.0.0`
6. **Builds ALL services** (tag-based builds are full releases)
7. **Tags images** with:
   - `latest`
   - `1.0.0` (full version)
   - `1.0` (major.minor)
   - `sha-abc1234` (commit SHA)
8. **Pushes to Prod GCP Project** Artifact Registry
9. **Summary shows:** Environment (prod), version from tag, built services

**Important Notes:**
- Production builds are **ONLY** triggered by pushing tags
- Tags must follow semantic versioning: `X.Y.Z` or `vX.Y.Z`
- Pushing to master branch alone will **NOT** trigger production builds
- Tag can be created before or after merge, but push tag to trigger build

## Manual Workflow Dispatch

You can manually trigger builds from the GitHub Actions UI:

1. Go to **Actions** tab in GitHub
2. Select workflow (e.g., "Build and Push All Services to GCR")
3. Click **Run workflow**
4. Select options:
   - Branch: `develop` or `master`
   - Services to build: `all`, `changed-only`, or specific service
   - Custom tag (optional)

The environment will be auto-detected from the branch selected.

## Environment Labels

All Docker images are labeled with environment metadata:

```dockerfile
LABEL com.cloudappdev.environment=dev
LABEL com.cloudappdev.service=user-service
LABEL com.cloudappdev.build.number=123
LABEL com.cloudappdev.git.sha=abc1234
LABEL com.cloudappdev.git.branch=develop
```

### Inspect Image Labels

```bash
docker inspect europe-west1-docker.pkg.dev/<PROJECT_ID>/docker-repo/cloudappdev-user-service:latest \
  --format='{{json .Config.Labels}}' | jq
```

## Pulling Images

### Development Images

```bash
# Set variables
DEV_REGISTRY=europe-west1-docker.pkg.dev/<DEV_PROJECT_ID>/docker-repo
VERSION=0.1.0-dev.42

# Pull service images
docker pull ${DEV_REGISTRY}/cloudappdev-frontend:${VERSION}
docker pull ${DEV_REGISTRY}/cloudappdev-user-service:${VERSION}
docker pull ${DEV_REGISTRY}/cloudappdev-itinerary-service:${VERSION}
docker pull ${DEV_REGISTRY}/cloudappdev-social-service:${VERSION}
docker pull ${DEV_REGISTRY}/cloudappdev-travel-info-service:${VERSION}
docker pull ${DEV_REGISTRY}/cloudappdev-api-gateway:${VERSION}
```

### Production Images

```bash
# Set variables
PROD_REGISTRY=europe-west1-docker.pkg.dev/<PROD_PROJECT_ID>/docker-repo
VERSION=0.1.6

# Pull service images
docker pull ${PROD_REGISTRY}/cloudappdev-frontend:${VERSION}
docker pull ${PROD_REGISTRY}/cloudappdev-user-service:${VERSION}
docker pull ${PROD_REGISTRY}/cloudappdev-itinerary-service:${VERSION}
docker pull ${PROD_REGISTRY}/cloudappdev-social-service:${VERSION}
docker pull ${PROD_REGISTRY}/cloudappdev-travel-info-service:${VERSION}
docker pull ${PROD_REGISTRY}/cloudappdev-api-gateway:${VERSION}
```

## Terraform Integration

The Terraform configurations in `terraform/environments/dev/` and `terraform/environments/prod/` should reference the correct GCP projects:

### Dev Environment (`terraform/environments/dev/terraform.tfvars`)
```hcl
project_id  = "<DEV_PROJECT_ID>"
environment = "dev"
```

### Prod Environment (`terraform/environments/prod/terraform.tfvars`)
```hcl
project_id  = "<PROD_PROJECT_ID>"
environment = "prod"
```

## Troubleshooting

### Issue: Workflow fails with "Authentication failed"

**Solution:** Verify service account keys are correctly set in GitHub Secrets:
```bash
# Test authentication locally
cat github-actions-key.json | docker login -u _json_key --password-stdin europe-west1-docker.pkg.dev
```

### Issue: "Repository not found" error

**Solution:** Create Artifact Registry repository:
```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=europe-west1 \
  --project=<PROJECT_ID>
```

### Issue: Images built for wrong environment

**Solution:** Check that the branch triggering the workflow is correct:
- `develop` → Dev environment
- `master` → Prod environment

### Issue: Git tags not pushed

**Solution:** Ensure GitHub Actions has write permissions:
```yaml
permissions:
  contents: write
```

### Issue: Version not incrementing

**Solution:** Fetch all git tags before version generation:
```bash
git fetch --tags
git describe --tags --abbrev=0
```

## Best Practices

### Development Workflow

1. **Feature Development:**
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git push origin feature/my-feature
   # Create PR to develop
   ```

2. **PR to Develop:**
   - PR is reviewed and merged to `develop`
   - **Dev CI/CD automatically triggered**
   - Version auto-increments (e.g., `0.0.42` → `0.0.43`)
   - Images pushed to **Dev GCP Project**
   - Dev environment updated with new images

### Production Release Workflow

**Step 1: Prepare Release Branch**
```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
# Update CHANGELOG.md, documentation, etc.
git commit -am "chore: prepare release v1.0.0"
git push origin release/v1.0.0
# Create PR to master
```

**Step 2: Review and Merge PR**
- PR is reviewed and approved
- Merge PR to `master` branch
- **Do NOT push yet!**

**Step 3: Create Git Tag**
```bash
git checkout master
git pull origin master

# Create annotated tag (recommended)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Or lightweight tag
git tag v1.0.0
```

**Step 4: Push with Tags**
```bash
# Push commits AND tags together
git push origin master --tags

# Alternative: Push separately
git push origin master
git push origin v1.0.0
```

**Step 5: Verify Build**
- **Prod CI/CD triggered** by push
- Workflow reads tag `v1.0.0`
- Images built with version `1.0.0`
- Images pushed to **Prod GCP Project**

**Step 6: Sync Develop with Master**
```bash
git checkout develop
git merge master
git push origin develop
```

### Version Numbering Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **Major version** (`X.0.0`): Breaking changes, incompatible API changes
- **Minor version** (`1.X.0`): New features, backwards-compatible
- **Patch version** (`1.0.X`): Bug fixes, backwards-compatible

**Examples:**
- `v1.0.0` - Initial release
- `v1.1.0` - Added new feature
- `v1.1.1` - Fixed bug in feature
- `v2.0.0` - Breaking change (new API)

## Monitoring

### Check Workflow Status

GitHub Actions UI:
```
Repository → Actions → Select workflow run
```

### View Build Logs

```
Actions → Select workflow run → Select job → View logs
```

### Check Artifact Registry

```bash
# List all images in Dev
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/<DEV_PROJECT_ID>/docker-repo

# List all images in Prod
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/<PROD_PROJECT_ID>/docker-repo
```

### Check Image Tags

```bash
# List tags for a specific image
gcloud artifacts docker tags list \
  europe-west1-docker.pkg.dev/<PROJECT_ID>/docker-repo/cloudappdev-frontend
```

## Security Considerations

1. **Service Account Permissions:**
   - Grant minimum required permissions
   - Use separate service accounts for dev/prod
   - Regularly rotate service account keys

2. **Secret Management:**
   - Never commit service account keys to git
   - Store keys only in GitHub Secrets
   - Use environment-specific keys

3. **Image Scanning:**
   - Consider enabling Artifact Registry vulnerability scanning
   - Review scan results before deploying to production

4. **Access Control:**
   - Limit who can push to `master` branch
   - Require PR reviews before merging
   - Use branch protection rules

## Future Enhancements

- [ ] Add staging environment between dev and prod
- [ ] Implement image vulnerability scanning
- [ ] Add automated deployment to Kubernetes clusters
- [ ] Implement rollback mechanisms
- [ ] Add Slack/Discord notifications on build success/failure
- [ ] Implement canary deployments for production

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Semantic Versioning](https://semver.org/)

---

**Last Updated:** 2026-01-02
**Maintained by:** CloudAppDev Team
