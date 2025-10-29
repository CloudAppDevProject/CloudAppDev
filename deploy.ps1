# Google Cloud Run Deployment Script for CloudAppDev
# Usage: .\deploy.ps1 [deploy|delete|update|logs]

param(
    [Parameter(Position=0)]
    [ValidateSet('deploy', 'delete', 'update', 'logs', 'status')]
    [string]$Action = 'deploy'
)

# Configuration Variables - UPDATE THESE
$APP_NAME = "CloudAppDev Application"
$PROJECT_ID = "oceanic-citadel-474512-c1"
$VERSION = "1.0"
$REGION = "europe-west1"

# Database Configuration
$INSTANCE = "cloudappdev-db"
$DB = "clouddev"
$DB_USER = "clouddev_user"
$DB_PASS = "clouddev_pass"  # CHANGE THIS!

# Service Configuration
$RUN_SA = "cloudappdev-run-sa"
$SERVICE = "cloudappdev-app"

# Derived variables
$IMAGE_TAG = "${REGION}-docker.pkg.dev/${PROJECT_ID}/docker-repo/cloudappdev:${VERSION}"

function Write-Step {
    param([string]$Message)
    Write-Host "`n===> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Load-EnvFile {
    Write-Step "Loading environment variables from .env file..."
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value -replace '^["'']|["'']$', ''
                Set-Variable -Name $name -Value $value -Scope Script
                Write-Host "  Loaded: $name" -ForegroundColor Gray
            }
        }
        Write-Success "Environment variables loaded"
    } else {
        Write-Error ".env file not found!"
        exit 1
    }
}

function Deploy-Full {
    Write-Step "Starting full deployment to Google Cloud..."
    
    # Load environment variables
    Load-EnvFile
    
    # Set project
    Write-Step "Setting active project..."
    gcloud config set project $PROJECT_ID
    
    # Check if Cloud SQL instance exists
    Write-Step "Checking Cloud SQL instance..."
    $ErrorActionPreference = "SilentlyContinue"
    gcloud sql instances describe $INSTANCE 2>$null
    $instanceExists = $LASTEXITCODE -eq 0
    $ErrorActionPreference = "Continue"
    
    if (-not $instanceExists) {
        Write-Step "Creating Cloud SQL instance (this takes ~10 minutes)..."
        
        # First, verify authentication and permissions
        Write-Host "Current authenticated account:"
        gcloud auth list
        
        gcloud sql instances create $INSTANCE `
            --database-version=POSTGRES_16 `
            --tier=db-f1-micro `
            --region=$REGION `
            --root-password=$DB_PASS `
            --no-backup `
            --edition=ENTERPRISE `
            --database-flags=max_connections=500

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create Cloud SQL instance. Please check:"
            Write-Host "1. Billing is enabled: https://console.cloud.google.com/billing"
            Write-Host "2. You have permissions in project: $PROJECT_ID"
            Write-Host "3. Cloud SQL Admin API is enabled"
            exit 1
        }
        
        gcloud sql databases create $DB --instance=$INSTANCE
        gcloud sql users create $DB_USER --instance=$INSTANCE --password=$DB_PASS
        Write-Success "Cloud SQL instance created"
    } else {
        Write-Success "Cloud SQL instance already exists"
    }
    
    # Get connection name
    $CONN_NAME = gcloud sql instances describe $INSTANCE --format="value(connectionName)"
    Write-Host "Connection name: $CONN_NAME"
    
    # Check if service account exists
    Write-Step "Checking service account..."
    $ErrorActionPreference = "SilentlyContinue"
    $saCheck = gcloud iam service-accounts describe "${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" 2>$null
    $saExists = $LASTEXITCODE -eq 0
    $ErrorActionPreference = "Continue"
    
    if (-not $saExists) {
        Write-Step "Creating service account..."
        gcloud iam service-accounts create $RUN_SA --display-name="Cloud Run SA for CloudAppDev"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create service account"
            exit 1
        }
        
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
            --role="roles/cloudsql.client"
        
        # Add Storage Object Admin role for Google Cloud Storage
        Write-Step "Adding Storage permissions to service account..."
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
            --role="roles/storage.objectAdmin"
        
        # Add Firestore permissions
        Write-Step "Adding Firestore permissions to service account..."
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
            --role="roles/datastore.user"
        
        Write-Success "Service account created"
    } else {
        Write-Success "Service account already exists"
        # Ensure all required roles are assigned
        Write-Step "Ensuring service account has all required permissions..."
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
            --role="roles/cloudsql.client" --condition=None 2>$null
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
            --role="roles/storage.objectAdmin" --condition=None 2>$null
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
            --role="roles/datastore.user" --condition=None 2>$null
        Write-Success "Permissions verified"
    }
    
    # Enable APIs
    Write-Step "Enabling required APIs..."
    gcloud services enable artifactregistry.googleapis.com run.googleapis.com sqladmin.googleapis.com storage.googleapis.com vpcaccess.googleapis.com compute.googleapis.com firestore.googleapis.com
    
    # Check if Firestore database exists
    Write-Step "Checking Firestore database..."
    $firestoreExists = gcloud firestore databases describe --database="(default)" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Creating Firestore database in Native mode..."
        gcloud firestore databases create --location=$REGION --type=firestore-native
        Write-Success "Firestore database created"
    } else {
        Write-Success "Firestore database already exists"
    }
    
    # VPC Connector is no longer needed since we're using Firestore instead of external MongoDB
    # Keeping it for potential future use, but not creating it if it doesn't exist
    
    # Create artifact registry if needed
    $repoExists = gcloud artifacts.repositories describe docker-repo --location=$REGION 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Creating Artifact Registry repository..."
        gcloud artifacts repositories create docker-repo `
            --repository-format=docker `
            --location=$REGION `
            --description="Docker repository for CloudAppDev"
        Write-Success "Artifact Registry created"
    }
    
    # Configure Docker
    Write-Step "Configuring Docker authentication..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    
    # Check if Docker is running
    Write-Step "Checking Docker status..."
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker is not running!"
        Write-Host "`nPlease start Docker Desktop and wait until it's fully running." -ForegroundColor Yellow
        Write-Host "Then run this script again." -ForegroundColor Yellow
        exit 1
    }
    Write-Success "Docker is running"
    
    # Build and push image
    Write-Step "Building Docker image..."
    docker build --platform linux/amd64 -t cloudappdev:$VERSION .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    Write-Success "Docker build completed"
    
    Write-Step "Tagging and pushing image..."
    docker tag cloudappdev:$VERSION $IMAGE_TAG
    docker push $IMAGE_TAG
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker push failed"
        exit 1
    }
    Write-Success "Image pushed to Artifact Registry"
    
    # Deploy to Cloud Run
    Write-Step "Deploying to Cloud Run..."
    $DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@localhost/${DB}?host=/cloudsql/${CONN_NAME}&connection_limit=500"
    
    Write-Host "MongoDB URI: $MONGODB_URI" -ForegroundColor Gray
    Write-Host "Storage Bucket: $GOOGLE_CLOUD_STORAGE_BUCKET" -ForegroundColor Gray
    
    gcloud run deploy $SERVICE `
        --image=$IMAGE_TAG `
        --platform=managed `
        --region=$REGION `
        --allow-unauthenticated `
        --port=3000 `
        --memory=1Gi `
        --cpu=1 `
        --timeout=300 `
        --service-account="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" `
        --add-cloudsql-instances=$CONN_NAME `
        --vpc-egress=private-ranges-only `
        --set-env-vars="DATABASE_URL=${DATABASE_URL},NODE_ENV=production,POSTGRES_USER=${DB_USER},POSTGRES_PASSWORD=${DB_PASS},POSTGRES_DB=${DB},GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID},GOOGLE_CLOUD_STORAGE_BUCKET=${GOOGLE_CLOUD_STORAGE_BUCKET},GOOGLE_CLOUD_CREDENTIALS_BASE64=${GOOGLE_CLOUD_CREDENTIALS_BASE64},MONGODB_URI=${MONGODB_URI},MONGO_INITDB_DATABASE=clouddev"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment completed successfully!"
        Write-Host "`nYour application is now available at:"
        $URL = gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)"
        Write-Host $URL -ForegroundColor Green
    } else {
        Write-Error "Deployment failed"
        exit 1
    }
}

function Update-Service {
    Write-Step "Updating existing Cloud Run service..."
    
    # Load environment variables
    Load-EnvFile
    
    gcloud config set project $PROJECT_ID
    
    # Build and push new image
    Write-Step "Building Docker image..."
    docker build --platform linux/amd64 -t cloudappdev:$VERSION .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    
    Write-Step "Pushing image..."
    docker tag cloudappdev:$VERSION $IMAGE_TAG
    docker push $IMAGE_TAG
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker push failed"
        exit 1
    }
    Write-Success "Image pushed"
    
    # Update Cloud Run service
    Write-Step "Updating Cloud Run service..."
    
    # Get connection name for database
    $CONN_NAME = gcloud sql instances describe $INSTANCE --format="value(connectionName)"
    $DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@localhost/${DB}?host=/cloudsql/${CONN_NAME}&connection_limit=500"
    
    Write-Host "MongoDB URI: $MONGODB_URI" -ForegroundColor Gray
    Write-Host "Storage Bucket: $GOOGLE_CLOUD_STORAGE_BUCKET" -ForegroundColor Gray
    
    gcloud run deploy $SERVICE `
        --image=$IMAGE_TAG `
        --region=$REGION `
        --vpc-egress=private-ranges-only `
        --set-env-vars="DATABASE_URL=${DATABASE_URL},NODE_ENV=production,POSTGRES_USER=${DB_USER},POSTGRES_PASSWORD=${DB_PASS},POSTGRES_DB=${DB},GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID},GOOGLE_CLOUD_STORAGE_BUCKET=${GOOGLE_CLOUD_STORAGE_BUCKET},GOOGLE_CLOUD_CREDENTIALS_BASE64=${GOOGLE_CLOUD_CREDENTIALS_BASE64},MONGODB_URI=${MONGODB_URI},MONGO_INITDB_DATABASE=clouddev"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Update completed!"
        $URL = gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)"
        Write-Host "Service URL: $URL" -ForegroundColor Green
    } else {
        Write-Error "Update failed"
        exit 1
    }
}

function Delete-Resources {
    Write-Step "Deleting all Google Cloud resources..."
    Write-Host "WARNING: This will delete all resources for this application!" -ForegroundColor Yellow
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -ne "yes") {
        Write-Host "Deletion cancelled"
        exit 0
    }
    
    gcloud config set project $PROJECT_ID
    
    Write-Step "Deleting Cloud Run service..."
    gcloud run services delete $SERVICE --region=$REGION --quiet
    
    Write-Step "Deleting VPC Connector..."
    gcloud compute networks vpc-access connectors delete $VPC_CONNECTOR --region=$REGION --quiet
    
    Write-Step "Deleting firewall rule..."
    gcloud compute firewall-rules delete allow-mongodb-access --quiet
    
    Write-Step "Deleting Cloud SQL instance..."
    gcloud sql instances delete $INSTANCE --quiet
    
    Write-Step "Deleting service account..."
    gcloud iam service-accounts delete "${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com" --quiet
    
    Write-Step "Deleting Artifact Registry repository..."
    gcloud artifacts repositories delete docker-repo --location=$REGION --quiet
    
    Write-Success "All resources deleted"
}

function Show-Logs {
    Write-Step "Fetching Cloud Run logs..."
    gcloud config set project $PROJECT_ID
    gcloud run services logs tail $SERVICE --region=$REGION
}

function Show-Status {
    Write-Step "Fetching service status..."
    gcloud config set project $PROJECT_ID
    
    Write-Host "`nCloud Run Service:" -ForegroundColor Cyan
    gcloud run services describe $SERVICE --region=$REGION
    
    Write-Host "`nCloud SQL Instance:" -ForegroundColor Cyan
    gcloud sql instances describe $INSTANCE
}

# Main execution
switch ($Action) {
    'deploy' { Deploy-Full }
    'update' { Update-Service }
    'delete' { Delete-Resources }
    'logs' { Show-Logs }
    'status' { Show-Status }
    default { 
        Write-Host "Usage: .\deploy.ps1 [deploy|update|delete|logs|status]"
        exit 1
    }
}
