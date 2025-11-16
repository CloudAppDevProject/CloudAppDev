# Microservices Database Seeding

This directory contains the unified seed script for all three microservices.

## Quick Start

From the project root:

```bash
npm run seed:microservices
```

## What Gets Seeded

### User Service (PostgreSQL - port 5433)

- 10 diverse users (mix of traditional auth and Google auth)
- Users include: Emma Rodriguez, Liam Chen, Sofia Andersson, Noah Patel, etc.

### Itinerary Service (PostgreSQL - port 5434)

- 18 itineraries across all users
- Multiple locations per itinerary
- Destinations include: Rome, Tokyo, Barcelona, Iceland, Thailand, etc.

### Social Service (MongoDB - port 27017)

- 4+ sample comments on various itineraries
- 11+ likes distributed across users and itineraries

## Requirements

- Docker services running (script will auto-start if needed)
- Node.js installed
- Environment variables in `.env` file

## Environment Variables

The seed script uses these connection strings:

```env
USER_DATABASE_URL=postgresql://appuser:devpass123@localhost:5433/users_db?schema=public
ITINERARY_DATABASE_URL=postgresql://appuser:devpass123@localhost:5434/itineraries_db?schema=public
SOCIAL_MONGODB_URI=mongodb://localhost:27017/social_db
```

## Manual Execution

If you need to run the script manually:

```bash
cd scripts
npm install
npm run seed
```

## Troubleshooting

**Services not running?**

Start Docker services first:

```bash
docker-compose -f docker-compose.microservices.yml up -d
```

**Connection errors?**
Wait 15-30 seconds after starting services for databases to initialize.

**Missing dependencies?**
Run `npm install` in the `scripts` directory.
