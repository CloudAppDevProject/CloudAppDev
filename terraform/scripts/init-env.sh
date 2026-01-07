#!/bin/bash
# Initialize a new environment (create GCS state bucket and enable required GCP APIs)

set -e

ENVIRONMENT=$1
PROJECT_ID=$2

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$ENVIRONMENT" ] || [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Usage: ./init-env.sh <environment> <project-id>${NC}"
  echo "  environment: dev, prod"
  echo "  project-id: GCP project ID"
  echo ""
  echo "Example:"
  echo "  ./init-env.sh dev my-project-dev-123456"
  exit 1
fi

BUCKET_NAME="cloudappdev-tf-state-${ENVIRONMENT}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CloudAppDev - Environment Initialization Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${GREEN}GCP Project:${NC} ${PROJECT_ID}"
echo -e "${GREEN}State Bucket:${NC} ${BUCKET_NAME}"
echo ""

# ============================================================================
# Step 1: Enable Required GCP APIs
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Enabling Required GCP APIs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Define all required APIs for Terraform and Kubernetes
REQUIRED_APIS=(
  # Core Infrastructure
  "cloudresourcemanager.googleapis.com"    # Resource Manager API (project management)
  "serviceusage.googleapis.com"             # Service Usage API (enable/disable APIs)
  "iam.googleapis.com"                      # Identity and Access Management API

  # Compute & Networking
  "compute.googleapis.com"                  # Compute Engine API (VPC, networking, load balancers)

  # Databases
  "sqladmin.googleapis.com"                 # Cloud SQL Admin API (PostgreSQL instances)
  "firestore.googleapis.com"                # Firestore API (NoSQL database)

  # Storage
  "storage.googleapis.com"                  # Cloud Storage API (GCS buckets)
  "storage-api.googleapis.com"              # Cloud Storage JSON API

  # Secrets & Configuration
  "secretmanager.googleapis.com"            # Secret Manager API (sensitive data)

  # Container & Kubernetes
  "container.googleapis.com"                # Google Kubernetes Engine (GKE) API
  "artifactregistry.googleapis.com"         # Artifact Registry API (Docker images)

  # Cloud Run (if using PaaS deployment)
  "run.googleapis.com"                      # Cloud Run API

  # Monitoring & Logging
  "logging.googleapis.com"                  # Cloud Logging API
  "monitoring.googleapis.com"               # Cloud Monitoring API

  # Networking Services
  "servicenetworking.googleapis.com"        # Service Networking API (VPC peering)
  "dns.googleapis.com"                      # Cloud DNS API

  # Certificate Management
  "certificatemanager.googleapis.com"       # Certificate Manager API (SSL certificates)
)

echo -e "${YELLOW}Checking and enabling ${#REQUIRED_APIS[@]} required APIs...${NC}"
echo ""

ENABLED_COUNT=0
ALREADY_ENABLED_COUNT=0
FAILED_COUNT=0

for api in "${REQUIRED_APIS[@]}"; do
  # Extract service name for display
  SERVICE_NAME=$(echo "$api" | sed 's/.googleapis.com//')

  # Check if API is already enabled
  if gcloud services list --enabled --project="$PROJECT_ID" --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "$api"; then
    echo -e "${GREEN}✓${NC} ${SERVICE_NAME} - already enabled"
    ((ALREADY_ENABLED_COUNT++))
  else
    echo -e "${YELLOW}⟳${NC} ${SERVICE_NAME} - enabling..."
    if gcloud services enable "$api" --project="$PROJECT_ID" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} ${SERVICE_NAME} - enabled successfully"
      ((ENABLED_COUNT++))
    else
      echo -e "${RED}✗${NC} ${SERVICE_NAME} - failed to enable"
      ((FAILED_COUNT++))
    fi
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}API Enablement Summary:${NC}"
echo -e "  Already Enabled: ${ALREADY_ENABLED_COUNT}"
echo -e "  Newly Enabled:   ${ENABLED_COUNT}"
if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "  Failed:          ${RED}${FAILED_COUNT}${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Exit if any APIs failed to enable
if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "${RED}⚠️  Some APIs failed to enable. Please check permissions and try again.${NC}"
  exit 1
fi

# Wait a few seconds for API enablement to propagate
if [ $ENABLED_COUNT -gt 0 ]; then
  echo -e "${YELLOW}Waiting 10 seconds for API changes to propagate...${NC}"
  sleep 10
  echo ""
fi

# ============================================================================
# Step 2: Create Terraform State Bucket
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Creating Terraform State Bucket${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if bucket already exists
if gsutil ls -b "gs://${BUCKET_NAME}" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Bucket ${BUCKET_NAME} already exists${NC}"
else
  echo -e "${GREEN}Creating GCS bucket for Terraform state...${NC}"
  gsutil mb -p "$PROJECT_ID" -l europe-west1 "gs://${BUCKET_NAME}"

  # Enable versioning
  echo -e "${GREEN}Enabling versioning on state bucket...${NC}"
  gsutil versioning set on "gs://${BUCKET_NAME}"

  echo -e "${GREEN}✅ State bucket created successfully${NC}"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Environment Initialization Complete!                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ All required GCP APIs are enabled${NC}"
echo -e "${GREEN}✓ Terraform state bucket is ready${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy terraform.tfvars.example to terraform.tfvars in environments/${ENVIRONMENT}/"
echo "   ${BLUE}cp environments/${ENVIRONMENT}/terraform.tfvars.example environments/${ENVIRONMENT}/terraform.tfvars${NC}"
echo ""
echo "2. Fill in your actual values in terraform.tfvars"
echo "   ${BLUE}nano environments/${ENVIRONMENT}/terraform.tfvars${NC}"
echo ""
echo "3. Initialize Terraform backend"
echo "   ${BLUE}cd terraform && terraform init -backend-config=environments/${ENVIRONMENT}/backend.tf${NC}"
echo ""
echo "4. Plan your infrastructure"
echo "   ${BLUE}./scripts/deploy.sh ${ENVIRONMENT} plan${NC}"
echo ""
echo "5. Apply your infrastructure"
echo "   ${BLUE}./scripts/deploy.sh ${ENVIRONMENT} apply${NC}"
echo ""
