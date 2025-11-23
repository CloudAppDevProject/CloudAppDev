/**
 * Migration: Remove email field from newsletter-subscription collection
 *
 * This migration removes the email field from all documents in the
 * newsletter-subscription MongoDB collection since email is now fetched
 * dynamically from the User Service instead of being stored.
 *
 * Run with: npx ts-node src/newsletter/migrations/remove-email-field.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'appdb';
const COLLECTION_NAME = 'newsletter-subscriptions';

async function removeEmailField() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Count documents with email field
    const countBefore = await collection.countDocuments({ email: { $exists: true } });
    console.log(`Found ${countBefore} documents with email field`);

    if (countBefore === 0) {
      console.log('No documents with email field found. Migration already completed.');
      return;
    }

    // Remove email field from all documents
    const result = await collection.updateMany(
      { email: { $exists: true } },
      { $unset: { email: '' } }
    );

    console.log(`✅ Removed email field from ${result.modifiedCount} documents`);

    // Verify
    const countAfter = await collection.countDocuments({ email: { $exists: true } });
    console.log(`Verification: ${countAfter} documents still have email field`);

    if (countAfter === 0) {
      console.log('✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
removeEmailField().then(() => {
  process.exit(0);
});
