import { PrismaClient as UserPrismaClient } from '../services/user-service/node_modules/.prisma/client/index.js';
import { PrismaClient as ItineraryPrismaClient } from '../services/itinerary-service/node_modules/.prisma/client/index.js';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const userPrisma = new UserPrismaClient({
  datasources: {
    db: {
      url: process.env.USER_DATABASE_URL || 'postgresql://appuser:devpass123@localhost:5433/users_db?schema=public'
    }
  }
});

const itineraryPrisma = new ItineraryPrismaClient({
  datasources: {
    db: {
      url: process.env.ITINERARY_DATABASE_URL || 'postgresql://appuser:devpass123@localhost:5434/itineraries_db?schema=public'
    }
  }
});

const MONGODB_URI = process.env.SOCIAL_MONGODB_URI || 'mongodb://localhost:27017/social_db';

async function main() {
  console.log('🌱 Starting microservices database seeding...\n');

  // ==================== CLEAR EXISTING DATA ====================
  console.log('🗑️  Clearing existing data...');
  
  // Clear MongoDB (Social Service)
  const mongoClient = new MongoClient(MONGODB_URI);
  try {
    await mongoClient.connect();
    const db = mongoClient.db();
    await db.collection('comments').deleteMany({});
    await db.collection('likes').deleteMany({});
    console.log('✅ MongoDB cleared');
  } catch (err) {
    console.log('⚠️  MongoDB clearing skipped:', err.message);
  }

  // Clear Itinerary Service
  await itineraryPrisma.location.deleteMany({});
  await itineraryPrisma.itinerary.deleteMany({});
  console.log('✅ Itinerary Service cleared');

  // Clear User Service
  await userPrisma.user.deleteMany({});
  console.log('✅ User Service cleared\n');

  // ==================== CREATE USERS (User Service) ====================
  console.log('👥 Creating users in User Service...');
  const users = await Promise.all([
    userPrisma.user.create({
      data: {
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@example.com',
        password: '$2b$10$YourHashedPasswordHere123', // Pre-hashed password
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Liam Chen',
        email: 'liam.chen@example.com',
        googleUid: 'google_liam_uid_001',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Sofia Andersson',
        email: 'sofia.andersson@example.com',
        password: '$2b$10$YourHashedPasswordHere123',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Noah Patel',
        email: 'noah.patel@example.com',
        googleUid: 'google_noah_uid_002',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Olivia Schmidt',
        email: 'olivia.schmidt@example.com',
        password: '$2b$10$YourHashedPasswordHere123',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Ethan Kowalski',
        email: 'ethan.kowalski@example.com',
        googleUid: 'google_ethan_uid_003',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Ava Nakamura',
        email: 'ava.nakamura@example.com',
        password: '$2b$10$YourHashedPasswordHere123',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Lucas Dubois',
        email: 'lucas.dubois@example.com',
        googleUid: 'google_lucas_uid_004',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Maria Garcia',
        email: 'maria.garcia@example.com',
        password: '$2b$10$YourHashedPasswordHere123',
      },
    }),
    userPrisma.user.create({
      data: {
        name: 'Yuki Tanaka',
        email: 'yuki.tanaka@example.com',
        googleUid: 'google_yuki_uid_005',
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} users\n`);

  // ==================== CREATE ITINERARIES (Itinerary Service) ====================
  console.log('✈️  Creating itineraries in Itinerary Service...');
  const itineraries = await Promise.all([
    // Emma's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[0].id,
        title: 'Discovering Ancient Rome',
        destination: 'Rome, Italy',
        start_date: '2025-03-15',
        short_desc: 'A week exploring the eternal city',
        detail_desc: 'Starting with the Colosseum and Roman Forum, followed by Vatican City tours.',
        locations: {
          create: [
            {
              name: 'Colosseum & Roman Forum',
              start_date: '2025-03-15',
              end_date: '2025-03-16',
              short_desc: 'Ancient Roman ruins and gladiator arena',
              images: ['locations/rome_colosseum_1.jpg', 'locations/rome_forum_1.jpg'],
            },
            {
              name: 'Vatican City',
              start_date: '2025-03-17',
              end_date: '2025-03-18',
              short_desc: 'Sistine Chapel and St. Peter\'s Basilica',
              images: ['locations/vatican_sistine_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[0].id,
        title: 'Barcelona Architecture Tour',
        destination: 'Barcelona, Spain',
        start_date: '2025-05-20',
        short_desc: 'Gaudí masterpieces and Catalan culture',
        detail_desc: 'Deep dive into Barcelona\'s modernist architecture.',
        locations: {
          create: [
            {
              name: 'Sagrada Familia',
              start_date: '2025-05-20',
              end_date: '2025-05-20',
              short_desc: 'Gaudí\'s unfinished masterpiece basilica',
              images: ['locations/barcelona_sagrada_1.jpg'],
            },
          ],
        },
      },
    }),

    // Liam's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[1].id,
        title: 'Tokyo Tech & Tradition',
        destination: 'Tokyo, Japan',
        start_date: '2025-04-10',
        short_desc: 'Blending futuristic and traditional Tokyo',
        detail_desc: 'Experiencing Tokyo\'s contrasts.',
        locations: {
          create: [
            {
              name: 'Senso-ji Temple & Asakusa',
              start_date: '2025-04-10',
              end_date: '2025-04-11',
              short_desc: 'Tokyo\'s oldest Buddhist temple',
              images: ['locations/tokyo_sensoji_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[1].id,
        title: 'Kyoto Cultural Immersion',
        destination: 'Kyoto, Japan',
        start_date: '2025-04-18',
        short_desc: 'Traditional temples and tea ceremonies',
        detail_desc: 'Visiting Fushimi Inari shrine.',
        locations: {
          create: [
            {
              name: 'Fushimi Inari Shrine',
              start_date: '2025-04-18',
              end_date: '2025-04-19',
              short_desc: 'Thousands of vermillion torii gates',
              images: ['locations/kyoto_fushimi_1.jpg'],
            },
          ],
        },
      },
    }),

    // Sofia's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[2].id,
        title: 'Icelandic Adventure',
        destination: 'Reykjavik, Iceland',
        start_date: '2025-06-05',
        short_desc: 'Northern nature at its finest',
        detail_desc: 'Road trip around the Golden Circle.',
        locations: {
          create: [
            {
              name: 'Golden Circle - Gullfoss',
              start_date: '2025-06-05',
              end_date: '2025-06-06',
              short_desc: 'Majestic two-tier waterfall',
              images: ['locations/iceland_gullfoss_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[2].id,
        title: 'Norwegian Fjords Expedition',
        destination: 'Bergen, Norway',
        start_date: '2025-07-12',
        short_desc: 'Breathtaking fjords and hiking',
        detail_desc: 'Exploring Bergen\'s colorful Bryggen wharf.',
        locations: {
          create: [
            {
              name: 'Bergen Bryggen Wharf',
              start_date: '2025-07-12',
              end_date: '2025-07-13',
              short_desc: 'UNESCO World Heritage colorful buildings',
              images: ['locations/norway_bryggen_1.jpg'],
            },
          ],
        },
      },
    }),

    // Noah's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[3].id,
        title: 'Backpacking Southeast Asia',
        destination: 'Bangkok, Thailand',
        start_date: '2025-11-01',
        short_desc: '3-month adventure through Thailand, Vietnam, Cambodia',
        detail_desc: 'Starting in Bangkok with temple tours.',
        locations: {
          create: [
            {
              name: 'Bangkok Temples & Street Food',
              start_date: '2025-11-01',
              end_date: '2025-11-07',
              short_desc: 'Grand Palace, Wat Pho, floating markets',
              images: ['locations/bangkok_temple_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[3].id,
        title: 'Mumbai Food Safari',
        destination: 'Mumbai, India',
        start_date: '2025-09-15',
        short_desc: 'Culinary journey through Indian flavors',
        detail_desc: 'Street food tours in Chowpatty Beach.',
        locations: {
          create: [
            {
              name: 'Chowpatty Beach Street Food',
              start_date: '2025-09-15',
              end_date: '2025-09-16',
              short_desc: 'Pani puri, bhel puri, and sunset views',
              images: ['locations/mumbai_chowpatty_1.jpg'],
            },
          ],
        },
      },
    }),

    // Olivia's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[4].id,
        title: 'New Zealand South Island Road Trip',
        destination: 'Christchurch, New Zealand',
        start_date: '2025-12-05',
        short_desc: 'Epic landscapes and adventure sports',
        detail_desc: 'Campervan journey through South Island.',
        locations: {
          create: [
            {
              name: 'Queenstown Adventure Sports',
              start_date: '2025-12-05',
              end_date: '2025-12-08',
              short_desc: 'Bungee jumping, skiing, and lake views',
              images: ['locations/queenstown_bungee_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[4].id,
        title: 'Australian Great Barrier Reef',
        destination: 'Cairns, Australia',
        start_date: '2026-01-15',
        short_desc: 'Diving and tropical rainforest',
        detail_desc: 'Scuba diving and snorkeling at the Great Barrier Reef.',
        locations: {
          create: [
            {
              name: 'Great Barrier Reef Diving',
              start_date: '2026-01-15',
              end_date: '2026-01-17',
              short_desc: 'World\'s largest coral reef system',
              images: ['locations/barrier_reef_1.jpg'],
            },
          ],
        },
      },
    }),

    // Ethan's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[5].id,
        title: 'Trans-Siberian Railway Journey',
        destination: 'Moscow to Vladivostok, Russia',
        start_date: '2025-08-01',
        short_desc: 'Epic train journey across Russia',
        detail_desc: 'Week-long train adventure from Moscow through Siberia.',
        locations: {
          create: [
            {
              name: 'Moscow Red Square',
              start_date: '2025-08-01',
              end_date: '2025-08-02',
              short_desc: 'Kremlin, St. Basil\'s Cathedral',
              images: ['locations/moscow_red_square_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[5].id,
        title: 'Polish Heritage Tour',
        destination: 'Krakow, Poland',
        start_date: '2025-05-08',
        short_desc: 'History and culture of Poland',
        detail_desc: 'Exploring Krakow\'s medieval old town.',
        locations: {
          create: [
            {
              name: 'Krakow Old Town & Main Square',
              start_date: '2025-05-08',
              end_date: '2025-05-09',
              short_desc: 'Medieval market square and St. Mary\'s Basilica',
              images: ['locations/krakow_square_1.jpg'],
            },
          ],
        },
      },
    }),

    // Ava's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[6].id,
        title: 'Swiss Alps Skiing Holiday',
        destination: 'Zermatt, Switzerland',
        start_date: '2025-02-10',
        short_desc: 'World-class skiing under the Matterhorn',
        detail_desc: 'Week of skiing and snowboarding in Zermatt.',
        locations: {
          create: [
            {
              name: 'Matterhorn Glacier Paradise',
              start_date: '2025-02-10',
              end_date: '2025-02-13',
              short_desc: 'Highest cable car station in Europe',
              images: ['locations/zermatt_matterhorn_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[6].id,
        title: 'Vienna Classical Music Experience',
        destination: 'Vienna, Austria',
        start_date: '2025-04-22',
        short_desc: 'Mozart, palaces, and Sachertorte',
        detail_desc: 'Attending Vienna State Opera performance.',
        locations: {
          create: [
            {
              name: 'Vienna State Opera',
              start_date: '2025-04-22',
              end_date: '2025-04-23',
              short_desc: 'World-renowned opera house performance',
              images: ['locations/vienna_opera_1.jpg'],
            },
          ],
        },
      },
    }),

    // Lucas's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[7].id,
        title: 'Paris Fashion & Art Week',
        destination: 'Paris, France',
        start_date: '2025-03-03',
        short_desc: 'Haute couture and world-class museums',
        detail_desc: 'Timing visit with Paris Fashion Week.',
        locations: {
          create: [
            {
              name: 'Louvre Museum',
              start_date: '2025-03-03',
              end_date: '2025-03-04',
              short_desc: 'Mona Lisa and world-famous art collection',
              images: ['locations/paris_louvre_1.jpg'],
            },
          ],
        },
      },
    }),
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[7].id,
        title: 'Provence Lavender Fields',
        destination: 'Provence, France',
        start_date: '2025-07-05',
        short_desc: 'French countryside and lavender season',
        detail_desc: 'Renting a car to explore Provence lavender fields.',
        locations: {
          create: [
            {
              name: 'Valensole Lavender Fields',
              start_date: '2025-07-05',
              end_date: '2025-07-07',
              short_desc: 'Endless purple lavender rows at peak bloom',
              images: ['locations/provence_lavender_1.jpg'],
            },
          ],
        },
      },
    }),

    // Maria's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[8].id,
        title: 'Costa Rica Eco Adventure',
        destination: 'San José, Costa Rica',
        start_date: '2025-08-15',
        short_desc: 'Rainforests, beaches, and wildlife',
        detail_desc: 'Zip-lining through Monteverde Cloud Forest.',
        locations: {
          create: [
            {
              name: 'Monteverde Cloud Forest',
              start_date: '2025-08-15',
              end_date: '2025-08-17',
              short_desc: 'Canopy zip-lining and hanging bridges',
              images: ['locations/costarica_monteverde_1.jpg'],
            },
          ],
        },
      },
    }),

    // Yuki's itineraries
    itineraryPrisma.itinerary.create({
      data: {
        user_id: users[9].id,
        title: 'Seoul Modern Culture Trip',
        destination: 'Seoul, South Korea',
        start_date: '2025-10-01',
        short_desc: 'K-pop, tech, and traditional palaces',
        detail_desc: 'Exploring Gangnam district.',
        locations: {
          create: [
            {
              name: 'Gyeongbokgung Palace',
              start_date: '2025-10-01',
              end_date: '2025-10-02',
              short_desc: 'Grand Joseon Dynasty palace',
              images: ['locations/seoul_palace_1.jpg'],
            },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${itineraries.length} itineraries\n`);

  // ==================== CREATE COMMENTS & LIKES (Social Service) ====================
  console.log('💬 Creating comments and likes in Social Service...');
  try {
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // Drop indexes to avoid conflicts
    try {
      await db.collection('likes').dropIndexes();
    } catch (e) {
      // Index might not exist, ignore
    }
    
    // Comments
    const comments = [
      {
        user_id: users[1].id,
        itinerary_id: itineraries[0].id,
        content: 'Rome is absolutely magical! Make sure to book your Colosseum tickets in advance.',
        created_at: new Date(),
        user: {
          id: users[1].id,
          name: users[1].name,
          email: users[1].email
        }
      },
      {
        user_id: users[6].id,
        itinerary_id: itineraries[2].id,
        content: 'Tokyo is incredible! Don\'t miss the robot restaurant in Shinjuku.',
        created_at: new Date(),
        user: {
          id: users[6].id,
          name: users[6].name,
          email: users[6].email
        }
      },
      {
        user_id: users[0].id,
        itinerary_id: itineraries[6].id,
        content: 'Three months! That\'s the dream. Make sure to get travel insurance.',
        created_at: new Date(),
        user: {
          id: users[0].id,
          name: users[0].name,
          email: users[0].email
        }
      },
      {
        user_id: users[7].id,
        itinerary_id: itineraries[14].id,
        content: 'Vienna is beautiful! Standing room tickets at the Opera are only €10.',
        created_at: new Date(),
        user: {
          id: users[7].id,
          name: users[7].name,
          email: users[7].email
        }
      },
    ];

    await db.collection('comments').insertMany(comments);
    
    // Likes
    const likes = [
      { user_id: users[0].id, itinerary_id: itineraries[14].id, created_at: new Date() },
      { user_id: users[1].id, itinerary_id: itineraries[3].id, created_at: new Date() },
      { user_id: users[1].id, itinerary_id: itineraries[6].id, created_at: new Date() },
      { user_id: users[2].id, itinerary_id: itineraries[5].id, created_at: new Date() },
      { user_id: users[3].id, itinerary_id: itineraries[8].id, created_at: new Date() },
      { user_id: users[4].id, itinerary_id: itineraries[4].id, created_at: new Date() },
      { user_id: users[5].id, itinerary_id: itineraries[0].id, created_at: new Date() },
      { user_id: users[6].id, itinerary_id: itineraries[14].id, created_at: new Date() },
      { user_id: users[7].id, itinerary_id: itineraries[2].id, created_at: new Date() },
      { user_id: users[8].id, itinerary_id: itineraries[4].id, created_at: new Date() },
      { user_id: users[9].id, itinerary_id: itineraries[2].id, created_at: new Date() },
    ];

    await db.collection('likes').insertMany(likes);
    
    console.log(`✅ Created ${comments.length} comments and ${likes.length} likes\n`);
  } catch (err) {
    console.log('⚠️  MongoDB seeding skipped:', err.message);
  } finally {
    await mongoClient.close();
  }

  // ==================== SUMMARY ====================
  console.log('🎉 Microservices database seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`   • User Service: ${users.length} users`);
  console.log(`   • Itinerary Service: ${itineraries.length} itineraries`);
  console.log('   • Social Service: 4 comments, 11 likes\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await userPrisma.$disconnect();
    await itineraryPrisma.$disconnect();
  });
