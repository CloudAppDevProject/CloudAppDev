import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
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

if (!globalForMongo._mongoClientPromise) {
  client = new MongoClient(uri, options);
  globalForMongo._mongoClientPromise = client.connect();
  
  // Log connection establishment
  globalForMongo._mongoClientPromise.then(() => {
    console.log('MongoDB/Firestore connection established');
  }).catch((err) => {
    console.error('MongoDB/Firestore connection failed:', err);
  });
}

clientPromise = globalForMongo._mongoClientPromise;

// Export a module-scoped MongoClient promise
export default clientPromise;

/**
 * Connect to database and return the database instance
 * @returns {Promise<{client: MongoClient, db: Db}>}
 */
export async function connectToMongoDB() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGO_INITDB_DATABASE || "clouddev");
  return { client, db };
}
