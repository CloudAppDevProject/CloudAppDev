# MongoDB Setup

## Overview

This project includes MongoDB alongside PostgreSQL for specific use cases:

- **PostgreSQL** (via Prisma): Users, Itineraries (relational data)
- **MongoDB**: Likes (document-based, high-volume writes)

Both databases can be used independently in your Next.js application.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy and edit the `.env` file:

```bash
cp example.env .env
```

Add your MongoDB credentials:

```env
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_password
MONGO_INITDB_DATABASE=appdb
MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/appdb?authSource=admin
```

### 3. Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- MongoDB on port 27017

### 4. Initialize Databases (First time only)

```bash
# PostgreSQL migrations
npm run db:deploy

# MongoDB collections
npm run db:init-mongo
```

### 5. Use MongoDB in Your App

```javascript
import clientPromise from "@/lib/mongodb";

// Get MongoDB client
const client = await clientPromise;
const db = client.db("appdb");

// Example: Add a like
await db.collection("likes").insertOne({
  user_id: 1,
  itinerary_id: 42,
  created_at: new Date()
});

// Example: Get all likes for an itinerary
const likes = await db.collection("likes")
  .find({ itinerary_id: 42 })
  .toArray();

// Example: Check if user liked an itinerary
const hasLiked = await db.collection("likes").findOne({
  user_id: 1,
  itinerary_id: 42
});
```

## Production Deployment

### Manual Initialization

Run these commands in your production environment:

```bash
# 1. PostgreSQL migrations (only if not already migrated)
npm run db:deploy

# 2. MongoDB collections (idempotent - safe to run multiple times)
npm run db:init-mongo
```

### CI/CD Integration

Add to your deployment pipeline:

```bash
npm install
npm run db:deploy      # Run Prisma migrations
npm run db:init-mongo  # Initialize MongoDB
npm run build
npm start
```

## Available Collections

The MongoDB initialization creates:
- `likes` - with composite unique index on (user_id, itinerary_id)

## Verify MongoDB

```bash
# Connect to MongoDB
docker exec -it cloudappdev_mongodb mongosh -u admin -p your_password --authenticationDatabase admin

# Switch to database
use appdb

# View collections
show collections

# Query likes
db.likes.find()

# Check if user liked an itinerary
db.likes.findOne({ user_id: 1, itinerary_id: 42 })

# Count likes for an itinerary
db.likes.countDocuments({ itinerary_id: 42 })

# Check indexes
db.users.getIndexes()
```

## Docker Services

- **PostgreSQL**: `cloudappdev_db` (port 5432)
- **MongoDB**: `cloudappdev_mongodb` (port 27017)

Both databases run independently and persist data in Docker volumes.

## Features

✅ **Idempotent Initialization**: Can be run multiple times safely
✅ **Production Ready**: Proper error handling and logging
✅ **Automatic Indexes**: Performance-optimized collections
✅ **Health Checks**: Both databases monitored
✅ **ES Modules**: Modern JavaScript support

## Troubleshooting

### MongoDB Connection Failed

Check your `.env` file has correct credentials:
```bash
docker-compose logs mongodb
```

### Indexes Not Created

Re-run initialization:
```bash
npm run db:init-mongo
```

### Port Conflicts

Change MongoDB port in `docker-compose.yml`:
```yaml
ports:
  - "27018:27017"  # Use different port
```
