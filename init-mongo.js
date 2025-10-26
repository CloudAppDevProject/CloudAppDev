// MongoDB Initialization Script - Production Ready
// Idempotent: Can be run multiple times safely

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Build MongoDB URI from environment variables
const username = process.env.MONGO_INITDB_ROOT_USERNAME;
const password = process.env.MONGO_INITDB_ROOT_PASSWORD;
const database = process.env.MONGO_INITDB_DATABASE || "appdb";
const host = process.env.MONGO_HOST || "localhost";
const port = process.env.MONGO_PORT || "27017";

// Use MONGODB_URI if provided, otherwise build from components
const uri = process.env.MONGODB_URI || 
  `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;

console.log(uri);
if (!username || !password) {
  console.error("❌ MongoDB credentials not set");
  console.error("💡 Make sure your .env file has:");
  console.error("   MONGO_INITDB_ROOT_USERNAME=your_username");
  console.error("   MONGO_INITDB_ROOT_PASSWORD=your_password");
  process.exit(1);
}

async function initMongo() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const dbName = process.env.MONGO_INITDB_DATABASE;
    const db = client.db(dbName);

    // Check existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Initialize likes collection
    if (!collectionNames.includes("likes")) {
      console.log("📝 Creating likes collection...");
      await db.createCollection("likes");
      await db.collection("likes").createIndex({ user_id: 1, itinerary_id: 1 }, { unique: true });
      console.log("✅ Likes collection created with composite index");
    } else {
      console.log("ℹ️  Likes collection already exists");
      // Ensure index exists
      await db.collection("likes").createIndex({ user_id: 1, itinerary_id: 1 }, { unique: true });
    }

    console.log("✅ MongoDB initialization complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ MongoDB initialization failed:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run initialization
initMongo();

