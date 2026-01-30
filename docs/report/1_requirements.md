# 1 Requirements

CloudAppDev is a cloud-native B2B SaaS platform for social travel itinerary management. Users create, share, and discover travel itineraries with locations, images, and social interactions. The platform is built as a multi-tenant microservices application on Google Kubernetes Engine with three tenant tiers (Free, Standard, Enterprise).

## 1.1 System Context

![System Context Diagram](../system-context-diagram.drawio.svg)
**Actors:**

- **End User** -- Registers, creates itineraries, uploads images, likes/comments on content, subscribes to newsletters
- **Tenant Admin** -- Registers an organization, selects a tier, manages users within the tenant subdomain

**Neighboring Systems and External Interfaces:**

| System | Type | Purpose |
|--------|------|---------|
| **Weather Provider** | Weather information Provider | Provide weather information for a specific location & time interval |
| **Geaographic Location System** | Location Coordiantes | Provide the coordinates for a specified location or vice versa |

## 1.2 Feature Overview

| Feature | Description |
|---------|-------------|
| **User Registration & Auth** | Register via email/password. Firebase Auth issues tokens, the User Service verifies and manages profiles |
| **Itinerary Management** | Create, edit, and delete travel itineraries with title, destination, description, and date range. Each itinerary contains ordered locations with coordinates and images |
| **Image Upload** | Upload images to Google Cloud Storage via signed URLs. Images are associated with itinerary locations or user avatars |
| **Search & Discovery** | Search itineraries by destination or keyword. Browse public itineraries from other users |
| **Social Interactions** | Like and comment on itineraries. Stored in MongoDB for high-throughput read/write |
| **Email Newsletter** | Automated weekly newsletter with personalized content: trending destinations, engagement summaries, and quality-filtered itineraries. Kubernetes CronJob scheduling with retry logic |
| **Travel Information** | Weather data for itinerary destinations via external API integrations |
| **Multi-Tenancy** | Three-tier tenant model (Free, Standard, Enterprise) with subdomain-based routing, tier-specific resource limits, and infrastructure isolation for enterprise tenants |
| **Tenant Self-Service** | Organizations register, choose a tier, and receive a provisioned subdomain with automated infrastructure setup |

## 1.3 Domain Model

![Domain Model](../domain-model.drawio.svg)

**Core Entities and Relationships:**

**User** (PostgreSQL -- User Service)
- Attributes: `id`, `name`, `email`, `password`, `googleUid`, `avatarUrl`, `tenantUuid`
- A User belongs to one Tenant (via `tenantUuid`)
- A User creates many Itineraries

**Itinerary** (PostgreSQL -- Itinerary Service)
- Attributes: `id`, `user_id`, `title`, `destination`, `start_date`, `short_desc`, `detail_desc`, `created_at`
- An Itinerary belongs to one User
- An Itinerary has many Locations

**Location** (PostgreSQL -- Itinerary Service)
- Attributes: `id`, `itinerary_id`, `name`, `latitude`, `longitude`, `images[]`
- A Location belongs to one Itinerary
- Images stored as GCS URLs in an array field

**Like** (MongoDB -- Social Service)
- Attributes: `userId`, `itineraryId`, `createdAt`
- Unique compound index on `(userId, itineraryId)` prevents duplicate likes

**Comment** (MongoDB -- Social Service)
- Attributes: `userId`, `itineraryId`, `text`, `createdAt`
- Indexed on `(itineraryId, createdAt)` for efficient retrieval

**Newsletter Subscription** (MongoDB -- Social Service)
- Attributes: `userId`, `isSubscribed`, `frequency`, `preferences`
- Tracks user opt-in status and delivery preferences

**Tenant** (PostgreSQL -- Tenant Service)
- Attributes: `id`, `name`, `tier`, `domain`, `createdAt`
- A Tenant has many Users
- Tier determines infrastructure isolation level (shared vs. dedicated)

**Weather** (External API -- Travel Info Service)
- Attributes: `temp_c`, `feelslike_c`, `condition`, `wind_kph` (current); `date`, `maxtemp_c`, `mintemp_c`, `avgtemp_c`, `daily_chance_of_rain` (forecast)
- Queried per Location name with configurable forecast days
- Provides value-added travel insights for itinerary destinations

**Geographic Location** (External API -- Travel Info Service)
- Attributes: `lat`, `lon`, `name`, `address` (city, town, village, municipality)
- Supports forward geocoding (location name to coordinates) and reverse geocoding (coordinates to city name)
- Used to resolve coordinates for itinerary Locations