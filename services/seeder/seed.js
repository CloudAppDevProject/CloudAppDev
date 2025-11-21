// Unified Seeding Script for Kubernetes
// This script has direct access to all databases and handles ID dependencies internally
import { PrismaClient as UserPrismaClient } from './services/user-service/node_modules/.prisma/client/index.js';
import { PrismaClient as ItineraryPrismaClient } from './services/itinerary-service/node_modules/.prisma/client/index.js';
import { MongoClient } from 'mongodb';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

// Environment variables (provided by Kubernetes secrets)
const USER_DB_URL = process.env.USER_DATABASE_URL;
const ITINERARY_DB_URL = process.env.ITINERARY_DATABASE_URL;
const SOCIAL_MONGODB_URI = process.env.SOCIAL_MONGODB_URI;

// Path resolution: works both locally and in container
// Container: /app/seed-data/dataset.json
// Local: ../../seed-data/dataset.json (relative to services/seeder/)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getDatasetPath() {
  if (process.env.SEED_DATA_PATH) {
    return process.env.SEED_DATA_PATH;
  }
  
  // Try container path first
  const containerPath = '/app/seed-data/dataset.json';
  try {
    await access(containerPath, constants.R_OK);
    return containerPath;
  } catch {
    // Fallback to local development path
    return join(__dirname, '../../seed-data/dataset.json');
  }
}

const DATASET_PATH = await getDatasetPath();

// Initialize database clients
const userPrisma = new UserPrismaClient({
  datasources: { db: { url: USER_DB_URL } }
});

const itineraryPrisma = new ItineraryPrismaClient({
  datasources: { db: { url: ITINERARY_DB_URL } }
});

async function loadDataset() {
  console.log(`📂 Loading dataset from: ${DATASET_PATH}`);
  const raw = await readFile(DATASET_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function seedUsers(dataset) {
  console.log('\n👥 Seeding users...');
  await userPrisma.user.deleteMany();
  
  const userMap = new Map(); // key -> id mapping
  
  for (const record of dataset.users) {
    const { key, ...userData } = record;
    const created = await userPrisma.user.create({ data: userData });
    userMap.set(key, created.id);
    console.log(`   ✓ ${created.name} (${key} → ${created.id})`);
  }
  
  console.log(`✅ Created ${userMap.size} users`);
  return userMap;
}

async function seedItineraries(dataset, userMap) {
  console.log('\n✈️  Seeding itineraries...');
  await itineraryPrisma.location.deleteMany();
  await itineraryPrisma.itinerary.deleteMany();
  
  const itineraryMap = new Map(); // key -> id mapping
  
  for (const record of dataset.itineraries) {
    const { key, userKey, locations, ...itineraryData } = record;
    const userId = userMap.get(userKey);
    
    if (!userId) {
      throw new Error(`User not found for key: ${userKey}`);
    }
    
    const created = await itineraryPrisma.itinerary.create({
      data: {
        ...itineraryData,
        user_id: userId,
        locations: locations ? {
          create: locations.map(loc => ({
            name: loc.name,
            start_date: loc.start_date,
            end_date: loc.end_date,
            short_desc: loc.short_desc,
            images: loc.images || [],
            latitude: loc.latitude,
            longitude: loc.longitude,
          }))
        } : undefined
      }
    });
    
    itineraryMap.set(key, created.id);
    console.log(`   ✓ ${created.title} (${key} → ${created.id})`);
  }
  
  console.log(`✅ Created ${itineraryMap.size} itineraries`);
  return itineraryMap;
}

async function seedSocial(dataset, userMap, itineraryMap) {
  console.log('\n💬 Seeding social data (comments & likes)...');
  
  const mongoClient = new MongoClient(SOCIAL_MONGODB_URI);
  await mongoClient.connect();
  
  try {
    const db = mongoClient.db();
    
    // Clear existing data
    await db.collection('comments').deleteMany({});
    await db.collection('likes').deleteMany({});
    
    // Seed comments
    const comments = dataset.social?.comments || [];
    for (const comment of comments) {
      const userId = userMap.get(comment.userKey);
      const itineraryId = itineraryMap.get(comment.itineraryKey);
      
      if (!userId || !itineraryId) {
        console.warn(`   ⚠️  Skipping comment: missing user (${comment.userKey}) or itinerary (${comment.itineraryKey})`);
        continue;
      }
      
      await db.collection('comments').insertOne({
        userId: userId,        // Fixed: was user_id
        itineraryId: itineraryId,  // Fixed: was itinerary_id
        text: comment.text,        // Fixed: was content
        createdAt: new Date(),     // Fixed: was created_at
        updatedAt: new Date(),     // Added: required by schema timestamps
      });
      console.log(`   ✓ Comment from ${comment.userKey} on ${comment.itineraryKey}`);
    }
    
    // Seed likes
    const likes = dataset.social?.likes || [];
    for (const like of likes) {
      const userId = userMap.get(like.userKey);
      const itineraryId = itineraryMap.get(like.itineraryKey);
      
      if (!userId || !itineraryId) {
        console.warn(`   ⚠️  Skipping like: missing user (${like.userKey}) or itinerary (${like.itineraryKey})`);
        continue;
      }
      
      await db.collection('likes').insertOne({
        userId: userId,            // Already correct ✓
        itineraryId: itineraryId,  // Already correct ✓
        createdAt: new Date(),     // Fixed: was created_at
      });
    }
    
    console.log(`✅ Created ${comments.length} comments and ${likes.length} likes`);
  } finally {
    await mongoClient.close();
  }
}

async function main() {
  console.log('🌱 Starting unified microservice seeding...\n');
  console.log('🔗 Database connections:');
  console.log(`   • User DB: ${USER_DB_URL?.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`   • Itinerary DB: ${ITINERARY_DB_URL?.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`   • Social DB: ${SOCIAL_MONGODB_URI?.replace(/:[^:@]+@/, ':***@')}`);
  
  try {
    const dataset = await loadDataset();
    
    const userMap = await seedUsers(dataset);
    const itineraryMap = await seedItineraries(dataset, userMap);
    await seedSocial(dataset, userMap, itineraryMap);
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Users: ${userMap.size}`);
    console.log(`   • Itineraries: ${itineraryMap.size}`);
    console.log(`   • Comments: ${dataset.social?.comments?.length || 0}`);
    console.log(`   • Likes: ${dataset.social?.likes?.length || 0}`);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await userPrisma.$disconnect();
    await itineraryPrisma.$disconnect();
  }
}

main();
