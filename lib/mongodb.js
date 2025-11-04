import { MongoClient } from "mongodb";

// Defensive initialization: Only initialize MongoDB if URI is available
const uri = process.env.MONGODB_URI;

// Skip initialization during build or with dummy/missing credentials
if (!uri || uri.includes('dummy') || uri.includes('build')) {
  console.warn('[MongoDB] ⚠️  MONGODB_URI not available - skipping MongoDB initialization');
}

const options = {
  maxPoolSize: 20,        // Increased from 10 to 20
  minPoolSize: 10,        // Increased from 5 to 10
  maxIdleTimeMS: 300000,  // 5 minutes
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000,  // 45 seconds
  serverSelectionTimeoutMS: 10000, // 10 seconds
  retryWrites: false,     // Firestore doesn't support retryWrites
  readPreference: 'primary',
};

let client;
let clientPromise;

// ALWAYS use a global variable to reuse connections across requests
// This is critical for Cloud Run performance!
const globalForMongo = globalThis;

// Only create client if URI is valid
if (uri && !uri.includes('dummy') && !uri.includes('build')) {
  if (!globalForMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalForMongo._mongoClientPromise = client.connect();
    
    // Log connection establishment
    globalForMongo._mongoClientPromise.then(() => {
      console.log('[MongoDB] MongoDB/Firestore connection established');
    }).catch((err) => {
      console.error('[MongoDB] MongoDB/Firestore connection failed:', err);
    });
  }
  
  clientPromise = globalForMongo._mongoClientPromise;
} else {
  // Return null promise for build time
  clientPromise = null;
}

// Export a module-scoped MongoClient promise
export default clientPromise;

/**
 * Connect to database and return the database instance
 * @returns {Promise<{client: MongoClient, db: Db}>}
 */
export async function connectToMongoDB() {
  if (!clientPromise) {
    throw new Error('[MongoDB] MongoDB client not initialized. Check MONGODB_URI environment variable.');
  }
  
  const client = await clientPromise;
  const db = client.db(process.env.MONGO_INITDB_DATABASE || "clouddev");
  return { client, db };
}
