# Tenant Service

Tenant and Role Management Service for CloudAppDev multi-tenancy implementation.

## Overview

This service manages:
- **Tenants**: Organizations/companies using the platform
- **Roles**: User roles (user, admin)
- **UserRoles**: Assignment of roles to users within tenants

## Tech Stack

- NestJS 11
- PostgreSQL 16 (via Prisma)
- TypeScript 5.7

## Database Schema

- **Tenant**: id, name, tier (free/standard/enterprise), status, maxUsers
- **Role**: id, name, permissions (JSON)
- **UserRole**: id, userId, roleId, tenantId (cross-service relationship)

## Environment Variables

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/tenant_db
USER_SERVICE_URL=http://user-service:8080
PORT=8084
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## Development

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npx prisma migrate dev

# Seed roles
npm run seed:roles

# Start dev server
npm run start:dev
```

## API Endpoints

### Tenants
- `GET /api/v1/tenants/:id` - Get tenant by ID
- `POST /api/v1/tenants` - Create new tenant
- `PATCH /api/v1/tenants/:id` - Update tenant
- `GET /api/v1/tenants/:id/users` - Get users in tenant (Admin only)

### Roles
- `GET /api/v1/roles` - List all roles
- `GET /api/v1/roles/:id` - Get role by ID

### User Roles
- `GET /api/v1/user-roles/:userId` - Get user's roles
- `POST /api/v1/user-roles` - Assign role to user (Admin only)
- `DELETE /api/v1/user-roles/:id` - Remove role assignment (Admin only)

## Integration

This service is called by:
- **User Service**: For role lookups during login
- **Auth Service**: For tenant creation during registration

This service calls:
- **User Service**: To fetch users by tenantId

## Docker

```bash
# Build
docker build -t tenant-service .

# Run
docker run -p 8084:8084 tenant-service
```

## Prisma Commands

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Deploy migrations (production)
npx prisma migrate deploy

# Prisma Studio
npx prisma studio
```

## Notes

- No Prisma relations to other services (cross-service references via HTTP)
- Tenant isolation enforced via `tenantId` filtering
- Simple 2-role system: user, admin
