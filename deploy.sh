#!/bin/bash
# Google Cloud Run Deployment Script for CloudAppDev
# Usage: ./deploy.sh [deploy|delete|update|logs|status]

set -e

# Configuration Variables - UPDATE THESE
APP_NAME="CloudAppDev-PaaS"
PROJECT_ID="oceanic-citadel-474512-c1"
VERSION="1.0"
REGION="europe-west1"

# Database Configuration
INSTANCE="cloudappdev-db"
DB="clouddev"
DB_USER="clouddev_user"
DB_PASS="clouddev_pass"  # CHANGE THIS!

# Service Configuration
RUN_SA="cloudappdev-run-sa"
SERVICE="cloudappdev-app"

# Derived variables
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/docker-repo/cloudappdev:${VERSION}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${CYAN}===> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

deploy_full() {
    print_step "Starting full deployment to Google Cloud..."
    
    # Set project
    print_step "Setting active project..."
    gcloud config set project "$PROJECT_ID"
    
    # Check if Cloud SQL instance exists
    print_step "Checking Cloud SQL instance..."
    if ! gcloud sql instances describe "$INSTANCE" &>/dev/null; then
        print_step "Creating Cloud SQL instance (this takes ~10 minutes)..."
        
        # First, verify authentication and permissions
        echo "Current authenticated account:"
        gcloud auth list
        
        gcloud sql instances create "$INSTANCE" \
            --database-version=POSTGRES_16 \
            --tier=db-f1-micro \
            --region="$REGION" \
            --root-password="$DB_PASS" \
            --no-backup \
            --edition=ENTERPRISE
        
        if [ $? -ne 0 ]; then
            print_error "Failed to create Cloud SQL instance. Please check:"
            echo "1. Billing is enabled: https://console.cloud.google.com/billing"
            echo "2. You have permissions in project: $PROJECT_ID"
            echo "3. Cloud SQL Admin API is enabled"
            exit 1
        fi
        
        gcloud sql databases create "$DB" --instance="$INSTANCE"
        gcloud sql users create "$DB_USER" --instance="$INSTANCE" --password="$DB_PASS"
        print_success "Cloud SQL instance created"
    else
        print_success "Cloud SQL instance already exists"
    fi
    
    # Get connection name
    CONN_NAME="$(gcloud sql instances describe "$INSTANCE" --format='value(connectionName)')"
    echo "Connection name: $CONN_NAME"
    
    # Check if service account exists
    print_step "Checking service account..."
    if ! gcloud iam service-accounts describe "${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
        print_step "Creating service account..."
        gcloud iam service-accounts create "$RUN_SA" --display-name="Cloud Run SA for CloudAppDev"
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="roles/cloudsql.client"
        print_success "Service account created"
    else
        print_success "Service account already exists"
    fi
    
    # Enable APIs
    print_step "Enabling required APIs..."
    gcloud services enable artifactregistry.googleapis.com run.googleapis.com sqladmin.googleapis.com
    
    # Create artifact registry if needed
    if ! gcloud artifacts repositories describe docker-repo --location="$REGION" &>/dev/null; then
        print_step "Creating Artifact Registry repository..."
        gcloud artifacts repositories create docker-repo \
            --repository-format=docker \
            --location="$REGION" \
            --description="Docker repository for CloudAppDev"
        print_success "Artifact Registry created"
    fi
    
    # Configure Docker
    print_step "Configuring Docker authentication..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    
    # Build and push image
    print_step "Building Docker image..."
    docker build --platform linux/amd64 -t cloudappdev:"$VERSION" .
    if [ $? -ne 0 ]; then
        print_error "Docker build failed"
        exit 1
    fi
    print_success "Docker build completed"
    
    print_step "Tagging and pushing image..."
    docker tag cloudappdev:"$VERSION" "$IMAGE_TAG"
    docker push "$IMAGE_TAG"
    if [ $? -ne 0 ]; then
        print_error "Docker push failed"
        exit 1
    fi
    print_success "Image pushed to Artifact Registry"
    
    # Deploy to Cloud Run
    print_step "Deploying to Cloud Run..."
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost/${DB}?host=/cloudsql/${CONN_NAME}"
    
    gcloud run deploy "$SERVICE" \
        --image="$IMAGE_TAG" \
        --platform=managed \
        --region="$REGION" \
        --allow-unauthenticated \
        --port=3000 \
        --memory=1Gi \
        --cpu=1 \
        --service-account="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --add-cloudsql-instances="$CONN_NAME" \
        --set-env-vars="DATABASE_URL=${DATABASE_URL},NODE_ENV=production,POSTGRES_USER=${DB_USER},POSTGRES_PASSWORD=${DB_PASS},POSTGRES_DB=${DB}"
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
        echo -e "\nYour application is now available at:"
        URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format="value(status.url)")
        echo -e "${GREEN}${URL}${NC}"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

update_service() {
    print_step "Updating existing Cloud Run service..."
    
    gcloud config set project "$PROJECT_ID"
    
    # Build and push new image
    print_step "Building Docker image..."
    docker build --platform linux/amd64 -t cloudappdev:"$VERSION" .
    if [ $? -ne 0 ]; then
        print_error "Docker build failed"
        exit 1
    fi
    
    print_step "Pushing image..."
    docker tag cloudappdev:"$VERSION" "$IMAGE_TAG"
    docker push "$IMAGE_TAG"
    if [ $? -ne 0 ]; then
        print_error "Docker push failed"
        exit 1
    fi
    print_success "Image pushed"
    
    # Update Cloud Run service
    print_step "Updating Cloud Run service..."
    gcloud run deploy "$SERVICE" --image="$IMAGE_TAG" --region="$REGION"
    
    if [ $? -eq 0 ]; then
        print_success "Update completed!"
        URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format="value(status.url)")
        echo -e "Service URL: ${GREEN}${URL}${NC}"
    else
        print_error "Update failed"
        exit 1
    fi
}

delete_resources() {
    print_step "Deleting all Google Cloud resources..."
    echo -e "${YELLOW}WARNING: This will delete all resources for this application!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Deletion cancelled"
        exit 0
    fi
    
    gcloud config set project "$PROJECT_ID"
    
    print_step "Deleting Cloud Run service..."
    gcloud run services delete "$SERVICE" --region="$REGION" --quiet || true
    
    print_step "Deleting Cloud SQL instance..."
    gcloud sql instances delete "$INSTANCE" --quiet || true
    
    print_step "Deleting service account..."
    gcloud iam service-accounts delete "${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" --quiet || true
    
    print_step "Deleting Artifact Registry repository..."
    gcloud artifacts repositories delete docker-repo --location="$REGION" --quiet || true
    
    print_success "All resources deleted"
}

show_logs() {
    print_step "Fetching Cloud Run logs..."
    gcloud config set project "$PROJECT_ID"
    gcloud run services logs tail "$SERVICE" --region="$REGION"
}

show_status() {
    print_step "Fetching service status..."
    gcloud config set project "$PROJECT_ID"
    
    echo -e "\n${CYAN}Cloud Run Service:${NC}"
    gcloud run services describe "$SERVICE" --region="$REGION"
    
    echo -e "\n${CYAN}Cloud SQL Instance:${NC}"
    gcloud sql instances describe "$INSTANCE"
}

# Main execution
ACTION="${1:-deploy}"
case "$ACTION" in
    deploy)
        deploy_full
        ;;
    update)
        update_service
        ;;
    delete)
        delete_resources
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {deploy|update|delete|logs|status}"
        exit 1
        ;;
esac
