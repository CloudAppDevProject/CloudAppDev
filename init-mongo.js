// MongoDB Initialization Script - Production Ready
// Idempotent: Can be run multiple times safely

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use MONGODB_URI directly
const uri = process.env.MONGODB_URI;

console.log("Connecting to:", uri ? "✓ URI provided" : "✗ No URI");

if (!uri) {
  console.error("❌ MONGODB_URI not set");
  console.error("💡 Make sure your .env file has:");
  console.error("   MONGODB_URI=mongodb://...");
  process.exit(1);
}

async function initMongo() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const dbName = process.env.MONGO_INITDB_DATABASE || "clouddev";
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

    // Initialize comments collection
    if (!collectionNames.includes("comments")) {
      console.log("📝 Creating comments collection...");
      await db.createCollection("comments");
      await db.collection("comments").createIndex({ itinerary_id: 1 });
      await db.collection("comments").createIndex({ user_id: 1 });
      console.log("✅ Comments collection created with indexes");
    } else {
      console.log("ℹ️  Comments collection already exists");
      // Ensure indexes exist
      await db.collection("comments").createIndex({ itinerary_id: 1 });
      await db.collection("comments").createIndex({ user_id: 1 });
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

