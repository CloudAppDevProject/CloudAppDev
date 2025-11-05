This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

[**Google cloud project**](https://console.cloud.google.com/welcome/new?orgonly=true&project=oceanic-citadel-474512-c1&supportedpurview=organizationId)
- Cloud SQL
- Cloud Storage Bucket
- Cloud Run
- Cloud Firestore
- Compute Engine VM Instances
- Cloud registry 

## Database Setup

This project uses **PostgreSQL** (via Prisma) and **MongoDB** for data storage.

### Quick Setup

```bash
# Install dependencies
npm install

# Configure environment
cp example.env .env
# Edit .env with your database credentials

# Start databases
docker-compose up -d

# Initialize databases (first time only)
npm run db:deploy        # PostgreSQL
npm run db:init-mongo    # MongoDB
```

See [MONGODB.md](./MONGODB.md) for detailed MongoDB documentation.

## Load Testing

This project includes load testing capabilities using [Locust](https://locust.io/). See [locust/README.md](./locust/README.md) for detailed instructions.

### Quick Start

```bash
# Install Locust
pip install locust

# Run load tests (make sure your app is running)
locust -f locust/locustfile.py --host=http://localhost:3000

# Open http://localhost:8089 in your browser to configure and start the test
```

### Google Cloud Storage Setup
1. Sign in to Google Cloud Console and create a new project.
2. Enable the "Cloud Storage" API for your project.
3. Create a new storage bucket to hold your files.
4. Create a service account with "Storage Object Admin" role and generate a JSON key file.
5. Set the following environment variables in your `.env` file:
   - `GOOGLE_CLOUD_PROJECT_ID`: Your Google Cloud project ID.
   - `GOOGLE_CLOUD_CREDENTIALS_BASE64`: The base64-encoded JSON key from your service account.
   - `GOOGLE_CLOUD_STORAGE_BUCKET`: The name of your Cloud Storage bucket.

### Firebase Authentication Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to "Authentication" and enable the desired sign-in methods (e.g., Email/Password).
3. Scrolle nach unten zum Abschnitt "Your apps" / "Deine Apps"
Falls du noch keine Web-App registriert hast, klicke auf das </> Symbol (Web), um eine hinzuzufügen
Wenn du bereits eine Web-App hast, klicke darauf
4. In your project settings, find your Firebase configuration and set the following environment variables in your `.env` file:
   - `NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY`: Your Firebase API key.
   - `NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN`: Your Firebase Auth domain.

### Firebase Admin SDK Setup
1. In the Firebase Console, go to "Project Settings" > "Service Accounts".
2. Generate a new private key and download the JSON file.
3. Base64-encode the JSON file and set it as the `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` environment variable in your `.env` file (same as for Google Cloud Storage).
4. The Firebase Admin SDK will use this service account for server-side operations.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

### PaaS - Google Cloud Platform

Automated deployment to Google Cloud Run with managed PostgreSQL database. Configure `PROJECT_ID` and `DB_PASS` in `deploy.ps1` (Windows) or `deploy.sh` (Linux/Mac), then run:

```bash
# Windows PowerShell
.\deploy.ps1 deploy

# Linux/Mac
./deploy.sh deploy
```

**Available commands:** `deploy` (full setup ~15-20min), `update` (app updates only), `logs`, `status`, `delete`  
**Requirements:** [Google Cloud SDK](https://cloud.google.com/sdk/docs/install), [Docker](https://www.docker.com/get-started), GCP account with billing enabled  
**Features:** Auto-scaling, managed HTTPS, Cloud SQL PostgreSQL with automatic backups

### Docker Compose (Local)

```bash
docker compose db up -d
```

Local deployment with Nginx reverse proxy and optional SSL via Certbot. Configure `.env` file before starting.

### GitHub Actions: Build & Push Docker Image

This project uses a GitHub Actions workflow (`.github/workflows/build-and-push-app.yml`) to automate building and publishing the Docker image to Google Artifact Registry.

**Image Details:**
- **Image name:** `cloudappdev`
- **Registry:** `europe-west1-docker.pkg.dev/<GCP_PROJECT_ID>/docker-repo/cloudappdev`
- **Dockerfile:** Root of repository (`Dockerfile`)
- **Tags:**
  - `latest` (default branch)
  - `sha-<short git SHA>`
  - Semantic version tags (e.g., `1.0.0`, `1.0`)
  - PR number (e.g., `pr-123`)
  - Manual tag (via workflow dispatch)

**Build Arguments:**
- Database, MongoDB, GCS, and Firebase credentials are injected via GitHub secrets for secure builds.

**Trigger:**
- On push to the `develop` branch affecting key app files (`app/`, `lib/`, `prisma/`, `public/`, `Dockerfile`, `package.json`, workflow file)
- Manually via the GitHub Actions UI ("Run workflow" with custom tag)

The workflow checks out the code, sets up Docker Buildx, logs in to Google Artifact Registry, builds the image, tags it, and pushes it to the registry. A summary with image tags and registry location is provided after each run. The image is then automatically pulled and deployed from the registry by terraform. 

## 📊 Performance-Analyse: IaaS vs PaaS

### Test-Setup
- **IaaS**: https://cloudappdev.cloudappdev.site
- **PaaS**: https://cloudappdev-paas-frontend-577052020137.europe-west1.run.app
- **Workload**: Once-in-a-lifetime (Lastspitze)

### Ergebnisse

#### IaaS (cloudappdev.cloudappdev.site)
- **Requests**: 13.647 total, 450 failures (3,3%)
- **Response Time**: 
  - Median: 8.100 ms
  - Average: 9.304 ms
  - 95th percentile: 40.000 ms
  - Max: 92.000 ms
- **RPS**: 24,6

**Verhalten**: Mit steigender Last werden die Antwortzeiten allmählich länger. Bei Spitzenlasten gibt es Timeouts und Fehler, aber die Fehlerquote bleibt niedrig.

#### PaaS Standard (paas-frontend)
- **Requests**: 15.515 total, 8.062 failures (52%)
- **Response Time**:
  - Median: 7.900 ms
  - Average: 7.555 ms
  - 95th percentile: 18.000 ms
  - Max: 29.000 ms
- **RPS**: 88,0

**Verhalten**: Deutlich höhere Fehlerrate (>50%) obwohl die Antwortzeiten teilweise besser sind. Das System wird stark durch Cloud SQL gebremst und kann die Last nicht bewältigen.

#### PaaS Erhöht (nach Cloud SQL Ressourcen-Erhöhung)
Siehe `paasincresed.html` - Nach Erhöhung der Cloud SQL Ressourcen verbessert sich die Performance deutlich, und der Datenbank-Flaschenhals wird kleiner.

### Fazit

**IaaS** zeigt ein vorhersehbares Verhalten: Mit steigender Last werden die Antwortzeiten langsam länger, und es gibt vereinzelt Timeouts/Fehler (3,3%). Das System verhält sich stabil und nachvollziehbar.

**PaaS** wird stark durch Cloud SQL gebremst - obwohl erfolgreiche Requests schneller sind, scheitern über 50% aller Anfragen. Die verwaltete Datenbank wird zum harten Flaschenhals.

**PaaS mit mehr Ressourcen** zeigt, dass mehr Cloud SQL Leistung das Problem löst. Allerdings muss man bei PaaS die Datenbank-Ressourcen genau richtig planen.

**Empfehlung**: Bei Lastspitzen bietet IaaS bessere Kontrolle und Fehlertoleranz, während PaaS eine sorgfältigere Ressourcen-Planung erfordert.

## Terraform Infrastructure Setup

This project includes infrastructure-as-code provisioning using [Terraform](https://www.terraform.io/). The Terraform configuration is located in the `terraform/` directory and is designed to automate cloud resource management, typically for Google Cloud Platform (GCP).

### Quick Start

1. **Install Terraform**  
   Download and install Terraform from [terraform.io/downloads](https://www.terraform.io/downloads.html).

2. **Configure Variables**  
   Edit `terraform/terraform.tfvars` to set your project-specific values (e.g., GCP project ID, region, credentials).

3. **Initialize Terraform**  
   ```bash
   cd terraform
   terraform init
   ```

4. **Review the Plan**  
   ```bash
   terraform plan
   ```

5. **Apply Infrastructure Changes**  
   ```bash
   terraform apply
   ```
   Confirm the action when prompted.

6. **State & Backend**  
   The state file is managed locally or remotely (see `backend.tf`). For team use, configure a remote backend (e.g., Google Cloud Storage).

### Files Overview

- `main.tf`: Main resource definitions (networks, databases, compute, etc.)
- `variables.tf`: Input variables for customization
- `terraform.tfvars`: User-specific variable values
- `backend.tf`: Remote state configuration
- `.terraform.lock.hcl`: Provider version lock file
- `modules/`: Optional reusable modules
