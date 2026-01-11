# Multi-Tenant Architecture Rework

> **Date:** January 11, 2026
> **Status:** Implementation Complete
> **Branch:** develop

## Overview

This document describes the architectural changes made to support a true multi-tenant SaaS platform with:
- UUID-based tenant identification
- Kubernetes namespace-based tenant isolation
- Dual login flow (users + tenant admins)
- Hub mode for tenant registration
- Simplified authorization model (no role tables)

---

## Key Changes Summary

### 1. Tenant Model Rework

**Before:**
```prisma
model Tenant {
  id        Int       @id @default(autoincrement())
  name      String
  tier      String    @default("free")
  status    String    @default("active")
  maxUsers  Int       @default(10)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

**After:**
```prisma
model Tenant {
  uuid      String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(255)      // Organization name
  email     String   @unique               // Admin email for login
  password  String                         // Hashed password (bcrypt)
  namespace String   @unique @db.VarChar(63)  // K8s namespace
  tier      String   @default("free")      // free, standard, enterprise
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Removed fields:** `id`, `status`, `maxUsers`
**Added fields:** `uuid` (primary key), `email`, `password`, `namespace`

### 2. Roles System Removal

The entire role-based authorization system has been removed. Authorization is now based on:
- **`loginType`**: `'user'` or `'tenant_admin'`
- **`IS_HUB` environment variable**: Controls Hub vs Tenant mode

**Removed database tables:**
- `roles`
- `user_roles`

**Removed modules:**
- `RolesModule`
- `UserRolesModule`

### 3. Dual Login Flow

Single `/login` endpoint that:
1. First tries the **Users table** (regular users)
2. Then tries the **Tenants table** (tenant admins via Tenant Service)

```typescript
// JWT payload for user login
{
  sub: userId,
  userId: 123,
  email: "user@example.com",
  tenantUuid: "uuid-...",
  loginType: "user"
}

// JWT payload for tenant admin login
{
  sub: "uuid-...",
  tenantUuid: "uuid-...",
  email: "admin@org.com",
  loginType: "tenant_admin",
  namespace: "org-namespace",
  tier: "standard"
}
```

**Note:** The `/login` endpoint returns a unified response shape for both login types:

```json
{
  "access_token": "<jwt>",
  "user": { /* user object */ }
}
```

- For regular users the `user` object contains user fields and `loginType: 'user'`.
- For tenant admins the `user` object contains tenant-admin-related fields (e.g. `id` set to the tenant `uuid`, and `tenantUuid`) and `loginType: 'tenant_admin'`.

Clients should rely on the `user` object and `user.loginType` to distinguish between user and tenant-admin logins.

### 4. Hub Mode (Registration Portal)

Controlled by `IS_HUB=true` environment variable.

**Hub Mode Routes (only these allowed):**
- `/register/plan` - Tier selection
- `/register/organization` - Organization name + namespace
- `/register/admin` - Admin email/password
- `/register/success` - Confirmation page

**Tenant Mode:**
- All `/register/*` routes blocked (redirect to `/login`)
- Normal app routes available with authentication

---

## Files Changed

### Backend - Tenant Service

| File | Change |
|------|--------|
| `services/tenant-service/prisma/schema.prisma` | Reworked Tenant model, removed Role/UserRole |
| `services/tenant-service/prisma/migrations/20260111000000_tenant_auth_rework/` | Migration for tenant model changes |
| `services/tenant-service/prisma/migrations/20260111100000_remove_roles/` | Migration to drop roles tables |
| `services/tenant-service/src/app.module.ts` | Removed RolesModule, UserRolesModule |
| `services/tenant-service/src/auth/tenant-auth.service.ts` | New service for tenant password/JWT |
| `services/tenant-service/src/auth/tenant-auth.module.ts` | New module for tenant auth |
| `services/tenant-service/src/tenants/tenants.service.ts` | Added register, checkNamespaceAvailability, findByNamespace |
| `services/tenant-service/src/tenants/tenants.controller.ts` | Added /register, /namespace/:ns/check, /auth/login endpoints |
| `services/tenant-service/src/tenants/dto/register-tenant.dto.ts` | New DTO with namespace validation |
| `services/tenant-service/src/guards/admin.guard.ts` | Check loginType instead of role |
| `services/tenant-service/src/guards/tenant-auth.guard.ts` | Removed role from payload |
| `services/tenant-service/src/seed.ts` | Simplified, removed role seeding |
| **Deleted:** `services/tenant-service/src/roles/` | Entire directory removed |
| **Deleted:** `services/tenant-service/src/user-roles/` | Entire directory removed |

### Backend - User Service

| File | Change |
|------|--------|
| `services/user-service/prisma/schema.prisma` | Changed tenantId to tenantUuid |
| `services/user-service/src/users/users.service.ts` | Removed HttpService, role fetching |
| `services/user-service/src/users/users.module.ts` | Removed HttpModule |
| `services/user-service/src/users/dto/create-user.dto.ts` | Changed tenantId to tenantUuid |
| `services/user-service/src/auth/auth.service.ts` | Dual login, removed role logic; normalizes tenant login response to `{ access_token, user }` |

### Frontend - Next.js

| File | Change |
|------|--------|
| `middleware.ts` | Added IS_HUB mode routing |
| `app/register/layout.tsx` | New minimal registration layout |
| `app/register/context/RegistrationContext.tsx` | New wizard state management |
| `app/register/plan/page.tsx` | New - tier selection |
| `app/register/organization/page.tsx` | New - org name + namespace |
| `app/register/admin/page.tsx` | New - admin credentials |
| `app/register/success/page.tsx` | New - confirmation page |
| `app/api/register/tenant/route.ts` | New - proxy to tenant-service |
| `app/api/register/check-namespace/route.ts` | New - namespace availability check |
| `app/api/users/invite/route.ts` | Check loginType instead of role |
| `app/admin/tenant/page.tsx` | Removed role column/actions |
| `app/admin/invite/page.tsx` | Removed role selection |
| **Deleted:** `app/api/roles/route.ts` | Role fetching removed |
| **Deleted:** `app/api/user-roles/[userId]/route.ts` | User roles removed |
| **Deleted:** `app/api/users/[id]/role/route.ts` | Role change removed |

### Infrastructure

| File | Change |
|------|--------|
| `nginx/gateway.conf` | Removed /api/v1/roles and /api/v1/user-roles routes |

---

## New API Endpoints

### Tenant Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/tenants/register` | Create new tenant with admin |
| `GET` | `/api/v1/tenants/namespace/:namespace/check` | Check namespace availability |
| `GET` | `/api/v1/tenants/namespace/:namespace` | Get tenant by namespace |
| `POST` | `/api/v1/tenants/auth/login` | Tenant admin login — returns `{ access_token, user }` where `user.loginType === 'tenant_admin'` |

### Frontend Proxies

| Method | Endpoint | Backend Target |
|--------|----------|----------------|
| `POST` | `/api/register/tenant` | `/api/v1/tenants/register` |
| `GET` | `/api/register/check-namespace` | `/api/v1/tenants/namespace/:ns/check` |

---

## Environment Variables

### New Variables

```env
# Hub Mode - set to "true" for registration portal
IS_HUB=false

# Default tenant namespace for user registration
DEFAULT_TENANT_NAMESPACE=free

# Free tenant configuration (for seeding)
FREE_TENANT_NAME=Free Community
FREE_TENANT_EMAIL=free@example.local
FREE_TENANT_PASSWORD=changeme
FREE_TENANT_NAMESPACE=free-community
```

---

## Registration Flow

### Step 1: Plan Selection (`/register/plan`)
- User selects tier: Free, Standard, or Enterprise
- Displays features/limits per tier

### Step 2: Organization (`/register/organization`)
- Input: Organization Name
- Input: Namespace (with real-time validation)
- Shows preview: `{namespace}.cloudappdev.io`
- Validates against reserved namespaces

### Step 3: Admin Account (`/register/admin`)
- Input: Admin Email
- Input: Password (with strength indicator)
- Creates tenant and admin credentials

### Step 4: Success (`/register/success`)
- Displays confirmation
- Shows tenant URL: `https://{namespace}.cloudappdev.io`
- Instructions to login at tenant URL

---

## Reserved Namespaces

The following namespaces are blocked during registration:

```typescript
const RESERVED_NAMESPACES = [
  'default',
  'kube-system',
  'kube-public',
  'kube-node-lease',
  'cloudappdev',
  'free',
  'standard',
  'enterprise',
  'admin',
  'api',
  'www',
  'app',
  'hub',
  'register',
  'login',
  'auth',
];
```

---

## Migration Guide

### Running Migrations

```bash
# Tenant Service
cd services/tenant-service
npx prisma migrate deploy
npx prisma generate

# User Service
cd services/user-service
npx prisma migrate deploy
npx prisma generate
```

### Seeding Default Tenant

```bash
cd services/tenant-service
npm run seed
```

---

## Testing Checklist

- [ ] Tenant registration creates new tenant with namespace
- [ ] Namespace validation rejects reserved namespaces
- [ ] Duplicate namespace detection works
- [ ] User login works (Users table)
- [ ] Tenant admin login works (Tenants table) and returns `{ access_token, user }` with `user.loginType === 'tenant_admin'`
- [ ] JWT contains correct loginType
- [ ] Hub mode only shows registration routes
- [ ] Tenant mode blocks registration routes
- [ ] Admin guard checks loginType correctly
- [ ] User invite requires tenant_admin loginType

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Hub Mode (IS_HUB=true)                  │
│                                                             │
│  /register/plan → /register/organization → /register/admin │
│                         ↓                                   │
│               POST /api/v1/tenants/register                 │
│                         ↓                                   │
│                  Creates Tenant + UUID                      │
│                         ↓                                   │
│              /register/success → tenant URL                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Tenant Mode (IS_HUB=false)                │
│                                                             │
│                       /login                                │
│                         ↓                                   │
│            ┌───────────────────────────┐                   │
│            │  Try Users Table First    │                   │
│            │  (loginType: 'user')      │                   │
│            └───────────┬───────────────┘                   │
│                        │ Not found                          │
│                        ↓                                    │
│            ┌───────────────────────────┐                   │
│            │  Try Tenants Table        │                   │
│            │  (loginType: 'tenant_admin')│                 │
│            └───────────┬───────────────┘                   │
│                        ↓                                    │
│                   JWT Token                                 │
│                        ↓                                    │
│              Normal App Routes                              │
└─────────────────────────────────────────────────────────────┘
```
