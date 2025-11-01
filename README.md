This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
3. In your project settings, find your Firebase configuration and set the following environment variables in your `.env` file:
   - `NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY`: Your Firebase API key.
   - `NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN`: Your Firebase Auth domain.

### Firebase Admin SDK Setup
1. In the Firebase Console, go to "Project Settings" > "Service Accounts".
2. Generate a new private key and download the JSON file.
3. Base64-encode the JSON file and set it as the `GOOGLE_CLOUD_CREDENTIALS_BASE64` environment variable in your `.env` file (same as for Google Cloud Storage).
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

### Vercel

Alternatively, deploy on the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
