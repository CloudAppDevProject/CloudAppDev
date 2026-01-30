# 3 Development View

## 3.1 Software Components

### Repository

The project uses a single monorepo hosted on GitHub: [CloudAppDev](https://github.com/Sprayer115/CloudAppDev).

**Repository structure:**

```
CloudAppDev/
├── app/                            # Next.js frontend (App Router)
│   ├── api/                        # Server-side API proxy routes
│   ├── components/                 # React UI components
│   ├── context/                    # React Context providers
│   ├── hooks/                      # Custom React hooks
│   └── [pages]/                    # Route pages (itineraries, login, profile, etc.)
├── services/                       # Backend microservices
│   ├── user-service/               # User management & authentication
│   ├── itinerary-service/          # Itinerary & location CRUD
│   ├── social-service/             # Likes, comments, newsletter
│   ├── travel-info-service/        # Weather & geocoding proxy
│   ├── tenant-service/             # Tenant registration & plan management
│   ├── provisioning-service/       # Orchestrates tenant provisioning
│   ├── infrastructure-provisioner/ # Terraform execution for infra
│   ├── seeder/                     # Unified DB seeding utility
│   └── shared/                     # Reusable guards & middleware
├── k8s/                            # Kubernetes Helm charts & manifests
├── terraform/                      # Infrastructure-as-Code (GCP)
│   ├── environments/               # dev, prod, dev-tenants
│   └── modules/                    # Reusable Terraform modules
├── nginx/                          # API Gateway config & Dockerfile
├── locust/                         # Load testing (Python)
├── seed-data/                      # Test dataset (dataset.json)
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.yml              # Monolithic local setup
└── docker-compose.microservices.yml # Microservices local setup
```

### Software Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Frontend** | `app/` | Next.js web application with server-side API proxy routes to the Gateway |
| **User Service** | `services/user-service/` | Registration, authentication (Firebase), profile management |
| **Itinerary Service** | `services/itinerary-service/` | Itinerary/location CRUD, image upload via GCS signed URLs |
| **Social Service** | `services/social-service/` | Likes, comments (MongoDB), email newsletter with async CronJob |
| **Travel Info Service** | `services/travel-info-service/` | Weather data and geocoding via external APIs |
| **Tenant Service** | `services/tenant-service/` | Tenant registration, tier management, subdomain resolution |
| **Provisioning Service** | `services/provisioning-service/` | Orchestrates tenant provisioning and deployment sync |
| **Infrastructure Provisioner** | `services/infrastructure-provisioner/` | Executes Terraform for infrastructure creation |
| **API Gateway** | `nginx/` | Nginx reverse proxy routing requests by path prefix to services |
| **Seeder** | `services/seeder/` | Unified database seeding across all microservice databases |

### Programming Languages, Frameworks, and Libraries

**TypeScript** is the primary language for the frontend and all NestJS backend services. **JavaScript (ES Modules)** is used for the Infrastructure Provisioner and the Seeder. **Python** is used for load testing. **HCL** is used for Terraform infrastructure definitions.

| Component | Language | Framework | Key Libraries |
|-----------|----------|-----------|---------------|
| **Frontend** | TypeScript | Next.js, React | PrimeReact, TailwindCSS, Recharts, Leaflet, jose |
| **User Service** | TypeScript | NestJS, Prisma | Firebase Admin, Passport, @google-cloud/storage |
| **Itinerary Service** | TypeScript | NestJS, Prisma | @google-cloud/storage, Axios |
| **Social Service** | TypeScript | NestJS, Mongoose | Nodemailer, SendGrid, Handlebars |
| **Travel Info Service** | TypeScript | NestJS | Axios |
| **Tenant Service** | TypeScript | NestJS, Prisma | Passport, bcryptjs |
| **Provisioning Service** | TypeScript | NestJS | Axios, class-validator |
| **Infrastructure Provisioner** | JavaScript | Express | Axios |
| **Seeder** | JavaScript | Prisma | MongoDB driver |
| **API Gateway** | Nginx config | Nginx | -- |
| **Load Tests** | Python | Locust | -- |
| **Infrastructure** | HCL | Terraform | GCP provider modules (cloudsql, storage, deployment, service-account, domain) |