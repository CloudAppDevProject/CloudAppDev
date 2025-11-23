/**
 * Migration: Remove email field from newsletter-subscription collection
 *
 * This migration removes the email field from all documents in the
 * newsletter-subscription MongoDB collection since email is now fetched
 * dynamically from the User Service instead of being stored.
 *
 * Run with:
 *   node migrations/remove-email-field.js
 *
 * Or with custom database:
 *   MONGODB_URI=mongodb://localhost:27017 MONGODB_DB_NAME=social_db node migrations/remove-email-field.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social_db';
// Extract DB name from URI or use default
const DB_NAME = MONGODB_URI.includes('/')
  ? MONGODB_URI.split('/').pop()
  : 'social_db';
const COLLECTION_NAME = 'newslettersubscriptions';

async function removeEmailField() {
  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    console.log(`  Database: ${DB_NAME}`);
    console.log(`  Collection: ${COLLECTION_NAME}`);

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(c => c.name === COLLECTION_NAME);

    if (!collectionExists) {
      console.log(`Collection '${COLLECTION_NAME}' does not exist. No migration needed.`);
      return;
    }

    // Count documents with email field
    const countBefore = await collection.countDocuments({ email: { $exists: true } });
    console.log(`Found ${countBefore} documents with email field`);

    if (countBefore === 0) {
      console.log('✓ No documents with email field found. Migration already completed.');
      return;
    }

    // Remove email field from all documents
    const result = await collection.updateMany(
      { email: { $exists: true } },
      { $unset: { email: '' } }
    );

    console.log(`✓ Removed email field from ${result.modifiedCount} documents`);

    // Verify
    const countAfter = await collection.countDocuments({ email: { $exists: true } });
    console.log(`Verification: ${countAfter} documents still have email field`);

    if (countAfter === 0) {
      console.log('✓ Migration completed successfully!');
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Disconnected from MongoDB');
  }
}

// Run migration
removeEmailField().then(() => {
  process.exit(0);
});
