import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.comment.deleteMany({});
  await prisma.itinerary.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Existing data cleared\n');

  // Create diverse users
  console.log('👥 Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@example.com',
        password: 'password123', // In production, this should be hashed!
      },
    }),
    prisma.user.create({
      data: {
        name: 'Liam Chen',
        email: 'liam.chen@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sofia Andersson',
        email: 'sofia.andersson@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Noah Patel',
        email: 'noah.patel@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Olivia Schmidt',
        email: 'olivia.schmidt@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ethan Kowalski',
        email: 'ethan.kowalski@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ava Nakamura',
        email: 'ava.nakamura@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Lucas Dubois',
        email: 'lucas.dubois@example.com',
        password: 'password123',
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} users\n`);

  // Create realistic itineraries
  console.log('✈️  Creating itineraries...');
  const itineraries = await Promise.all([
    // Emma's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[0].id,
        title: 'Discovering Ancient Rome',
        destination: 'Rome, Italy',
        start_date: '2025-03-15',
        short_desc: 'A week exploring the eternal city',
        detail_desc: 'Starting with the Colosseum and Roman Forum, followed by Vatican City tours. Planning to visit the Pantheon, Trevi Fountain, and enjoy authentic Italian cuisine in Trastevere. Also scheduling day trips to Pompeii and the Amalfi Coast.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[0].id,
        title: 'Barcelona Architecture Tour',
        destination: 'Barcelona, Spain',
        start_date: '2025-05-20',
        short_desc: 'Gaudí masterpieces and Catalan culture',
        detail_desc: 'Deep dive into Barcelona\'s modernist architecture - Sagrada Familia, Park Güell, Casa Batlló. Exploring Gothic Quarter, enjoying tapas in El Born, and relaxing at Barceloneta beach. Evening flamenco show planned.',
      },
    }),
    
    // Liam's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[1].id,
        title: 'Tokyo Tech & Tradition',
        destination: 'Tokyo, Japan',
        start_date: '2025-04-10',
        short_desc: 'Blending futuristic and traditional Tokyo',
        detail_desc: 'Experiencing Tokyo\'s contrasts: morning at Senso-ji Temple, afternoon in Akihabara electric town. Visiting teamLab Borderless, sushi at Tsukiji Outer Market, sumo tournament, and cherry blossom viewing in Ueno Park.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[1].id,
        title: 'Kyoto Cultural Immersion',
        destination: 'Kyoto, Japan',
        start_date: '2025-04-18',
        short_desc: 'Traditional temples and tea ceremonies',
        detail_desc: 'Visiting Fushimi Inari shrine with thousands of torii gates, experiencing authentic tea ceremony, exploring bamboo groves in Arashiyama, and staying in a traditional ryokan with kaiseki dinners.',
      },
    }),
    
    // Sofia's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[2].id,
        title: 'Icelandic Adventure',
        destination: 'Reykjavik, Iceland',
        start_date: '2025-06-05',
        short_desc: 'Northern nature at its finest',
        detail_desc: 'Road trip around the Golden Circle: Gullfoss waterfall, Geysir geothermal area, Thingvellir National Park. Relaxing in Blue Lagoon, whale watching tour, and hoping to catch the midnight sun.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[2].id,
        title: 'Norwegian Fjords Expedition',
        destination: 'Bergen, Norway',
        start_date: '2025-07-12',
        short_desc: 'Breathtaking fjords and hiking',
        detail_desc: 'Exploring Bergen\'s colorful Bryggen wharf, cruising through Sognefjord and Nærøyfjord, hiking to Trolltunga and Preikestolen. Taking the spectacular Flåm Railway through mountain landscapes.',
      },
    }),
    
    // Noah's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[3].id,
        title: 'Backpacking Southeast Asia',
        destination: 'Bangkok, Thailand',
        start_date: '2025-11-01',
        short_desc: '3-month adventure through Thailand, Vietnam, Cambodia',
        detail_desc: 'Starting in Bangkok with temple tours and street food. Moving to Chiang Mai for elephant sanctuary. Then Vietnam: Hanoi, Ha Long Bay, Hoi An. Finishing in Cambodia at Angkor Wat temples. Budget-friendly hostels and local transportation.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[3].id,
        title: 'Mumbai Food Safari',
        destination: 'Mumbai, India',
        start_date: '2025-09-15',
        short_desc: 'Culinary journey through Indian flavors',
        detail_desc: 'Street food tours in Chowpatty Beach, fine dining at heritage restaurants, cooking classes learning regional cuisines. Visiting spice markets, exploring Dharavi, and experiencing Bollywood film culture.',
      },
    }),
    
    // Olivia's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[4].id,
        title: 'New Zealand South Island Road Trip',
        destination: 'Christchurch, New Zealand',
        start_date: '2025-12-05',
        short_desc: 'Epic landscapes and adventure sports',
        detail_desc: 'Campervan journey through South Island: Queenstown for bungee jumping and skiing, Milford Sound cruise, stargazing in Tekapo, wine tasting in Marlborough, and hiking in Mount Cook National Park.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[4].id,
        title: 'Australian Great Barrier Reef',
        destination: 'Cairns, Australia',
        start_date: '2026-01-15',
        short_desc: 'Diving and tropical rainforest',
        detail_desc: 'Scuba diving and snorkeling at the Great Barrier Reef, exploring Daintree Rainforest, visiting indigenous cultural centers, and experiencing the laid-back Australian beach culture.',
      },
    }),
    
    // Ethan's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[5].id,
        title: 'Trans-Siberian Railway Journey',
        destination: 'Moscow to Vladivostok, Russia',
        start_date: '2025-08-01',
        short_desc: 'Epic train journey across Russia',
        detail_desc: 'Week-long train adventure from Moscow through Siberia to Vladivostok. Stops in Yekaterinburg, Irkutsk (Lake Baikal), and Ulan-Ude. Experiencing Russian culture, cuisine, and the world\'s longest railway journey.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[5].id,
        title: 'Polish Heritage Tour',
        destination: 'Krakow, Poland',
        start_date: '2025-05-08',
        short_desc: 'History and culture of Poland',
        detail_desc: 'Exploring Krakow\'s medieval old town and Wawel Castle, day trip to Auschwitz-Birkenau, visiting Wieliczka Salt Mine, enjoying pierogi and traditional Polish food, and experiencing vibrant nightlife in Kazimierz.',
      },
    }),
    
    // Ava's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[6].id,
        title: 'Swiss Alps Skiing Holiday',
        destination: 'Zermatt, Switzerland',
        start_date: '2025-02-10',
        short_desc: 'World-class skiing under the Matterhorn',
        detail_desc: 'Week of skiing and snowboarding in Zermatt with views of Matterhorn. Staying in cozy chalet, enjoying Swiss fondue and raclette, taking the Gornergrat Railway, and visiting ice palace inside the glacier.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[6].id,
        title: 'Vienna Classical Music Experience',
        destination: 'Vienna, Austria',
        start_date: '2025-04-22',
        short_desc: 'Mozart, palaces, and Sachertorte',
        detail_desc: 'Attending Vienna State Opera performance, visiting Schönbrunn and Belvedere palaces, exploring MuseumsQuartier, enjoying Viennese coffee house culture, and taking a waltz dancing lesson.',
      },
    }),
    
    // Lucas's itineraries
    prisma.itinerary.create({
      data: {
        user_id: users[7].id,
        title: 'Paris Fashion & Art Week',
        destination: 'Paris, France',
        start_date: '2025-03-03',
        short_desc: 'Haute couture and world-class museums',
        detail_desc: 'Timing visit with Paris Fashion Week, visiting Louvre and Musée d\'Orsay, exploring Montmartre and Sacré-Cœur, dining at Michelin-starred restaurants, and shopping in Le Marais. Day trip to Versailles planned.',
      },
    }),
    prisma.itinerary.create({
      data: {
        user_id: users[7].id,
        title: 'Provence Lavender Fields',
        destination: 'Provence, France',
        start_date: '2025-07-05',
        short_desc: 'French countryside and lavender season',
        detail_desc: 'Renting a car to explore Provence lavender fields in full bloom. Visiting historic Avignon, wine tasting in Châteauneuf-du-Pape, exploring hilltop villages like Gordes and Roussillon, and enjoying farm-to-table Provençal cuisine.',
      },
    }),
  ]);
  console.log(`✅ Created ${itineraries.length} itineraries\n`);

  // Create realistic comments
  console.log('💬 Creating comments...');
  const comments = await Promise.all([
    // Comments on Emma's Rome trip
    prisma.comment.create({
      data: {
        user_id: users[1].id, // Liam
        itinerary_id: itineraries[0].id,
        content: 'Rome is absolutely magical! Make sure to book your Colosseum tickets in advance to skip the lines. Also, don\'t miss the sunset view from Gianicolo Hill!',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[3].id, // Noah
        itinerary_id: itineraries[0].id,
        content: 'If you have time, take a day trip to Tivoli to see Villa d\'Este. The gardens are stunning! Also, try the gelato at Giolitti - it\'s been there since 1900.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[0].id, // Emma responding
        itinerary_id: itineraries[0].id,
        content: 'Thanks for the tips! I\'ve already booked Colosseum tickets. Will definitely add Tivoli to the plan!',
      },
    }),

    // Comments on Liam's Tokyo trip
    prisma.comment.create({
      data: {
        user_id: users[6].id, // Ava
        itinerary_id: itineraries[2].id,
        content: 'Tokyo is incredible! Don\'t miss the robot restaurant in Shinjuku - it\'s wild. Also, get a JR Pass if you\'re planning to visit Kyoto too.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[4].id, // Olivia
        itinerary_id: itineraries[2].id,
        content: 'For the best sushi experience, try Sushi Dai at Toyosu Market (moved from Tsukiji). Worth the early morning wait!',
      },
    }),

    // Comments on Sofia's Iceland trip
    prisma.comment.create({
      data: {
        user_id: users[2].id, // Sofia
        itinerary_id: itineraries[4].id,
        content: 'So excited for this trip! Anyone have recommendations for hiking gear rental in Reykjavik?',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[5].id, // Ethan
        itinerary_id: itineraries[4].id,
        content: 'Check out Iceland Mountain Guides - they rent quality gear and also offer guided tours if you want. The weather can change quickly, so layers are essential!',
      },
    }),

    // Comments on Noah's Southeast Asia trip
    prisma.comment.create({
      data: {
        user_id: users[7].id, // Lucas
        itinerary_id: itineraries[6].id,
        content: 'This sounds amazing! I did a similar route last year. In Bangkok, stay in Khao San Road area for the backpacker vibe. Also, Pai in northern Thailand is a hidden gem!',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[0].id, // Emma
        itinerary_id: itineraries[6].id,
        content: 'Three months! That\'s the dream. Make sure to get travel insurance that covers multiple countries. SafetyWing is popular with backpackers.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[3].id, // Noah responding
        itinerary_id: itineraries[6].id,
        content: 'Thanks for the advice! I\'ll check out Pai and definitely getting comprehensive insurance.',
      },
    }),

    // Comments on Olivia's New Zealand trip
    prisma.comment.create({
      data: {
        user_id: users[1].id, // Liam
        itinerary_id: itineraries[8].id,
        content: 'New Zealand is on my bucket list! Are you renting a campervan or car? I\'ve heard campervans give you so much freedom.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[4].id, // Olivia responding
        itinerary_id: itineraries[8].id,
        content: 'Going with a campervan! Booked through Jucy - they have great deals and the freedom to stay at DOC campsites is worth it.',
      },
    }),

    // Comments on Ethan's Trans-Siberian trip
    prisma.comment.create({
      data: {
        user_id: users[2].id, // Sofia
        itinerary_id: itineraries[10].id,
        content: 'This is such a unique trip! How did you manage to get the Russian visa? I heard it\'s quite complicated.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[5].id, // Ethan responding
        itinerary_id: itineraries[10].id,
        content: 'Used an agency called Real Russia - they handle all the visa paperwork and train bookings. Made it much easier!',
      },
    }),

    // Comments on Ava's Vienna trip
    prisma.comment.create({
      data: {
        user_id: users[7].id, // Lucas
        itinerary_id: itineraries[13].id,
        content: 'Vienna is beautiful! If you love classical music, try to get standing room tickets at the Opera - they\'re only €10 and the acoustics are amazing from anywhere.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[6].id, // Ava
        itinerary_id: itineraries[13].id,
        content: 'That\'s a great tip! I didn\'t know about the standing room tickets. Definitely doing that!',
      },
    }),

    // Comments on Lucas's Paris trip
    prisma.comment.create({
      data: {
        user_id: users[0].id, // Emma
        itinerary_id: itineraries[14].id,
        content: 'Paris during Fashion Week must be incredible! Are you going to any shows or just soaking in the atmosphere?',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[4].id, // Olivia
        itinerary_id: itineraries[14].id,
        content: 'Don\'t miss the Musée de l\'Orangerie for Monet\'s Water Lilies - it\'s less crowded than the main museums but equally stunning.',
      },
    }),
    prisma.comment.create({
      data: {
        user_id: users[7].id, // Lucas responding
        itinerary_id: itineraries[14].id,
        content: '@Emma - Got tickets to two shows through connections! @Olivia - Thanks, adding it to my list!',
      },
    }),
  ]);
  console.log(`✅ Created ${comments.length} comments\n`);

  // Seed MongoDB likes
  if (MONGODB_URI) {
    console.log('❤️  Creating likes in MongoDB...');
    const mongoClient = new MongoClient(MONGODB_URI);
    
    try {
      await mongoClient.connect();
      const dbName = process.env.MONGO_INITDB_DATABASE || 'clouddev';
      const db = mongoClient.db(dbName);
      const likesCollection = db.collection('likes');

      // Clear existing likes
      await likesCollection.deleteMany({});

      // Create realistic likes - people tend to like trips related to their interests
      const likes = [
        // Emma (likes European destinations)
        { user_id: users[0].id, itinerary_id: itineraries[14].id, created_at: new Date() }, // Lucas's Paris
        { user_id: users[0].id, itinerary_id: itineraries[13].id, created_at: new Date() }, // Ava's Vienna
        { user_id: users[0].id, itinerary_id: itineraries[11].id, created_at: new Date() }, // Ethan's Poland
        
        // Liam (likes Asian destinations)
        { user_id: users[1].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // His own Kyoto trip
        { user_id: users[1].id, itinerary_id: itineraries[6].id, created_at: new Date() }, // Noah's SE Asia
        { user_id: users[1].id, itinerary_id: itineraries[7].id, created_at: new Date() }, // Noah's Mumbai
        
        // Sofia (likes Nordic destinations)
        { user_id: users[2].id, itinerary_id: itineraries[5].id, created_at: new Date() }, // Her own Norway trip
        { user_id: users[2].id, itinerary_id: itineraries[12].id, created_at: new Date() }, // Ava's Swiss Alps
        
        // Noah (adventurous, likes diverse trips)
        { user_id: users[3].id, itinerary_id: itineraries[8].id, created_at: new Date() }, // Olivia's NZ
        { user_id: users[3].id, itinerary_id: itineraries[10].id, created_at: new Date() }, // Ethan's Trans-Siberian
        { user_id: users[3].id, itinerary_id: itineraries[4].id, created_at: new Date() }, // Sofia's Iceland
        { user_id: users[3].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        
        // Olivia (likes nature and adventure)
        { user_id: users[4].id, itinerary_id: itineraries[4].id, created_at: new Date() }, // Sofia's Iceland
        { user_id: users[4].id, itinerary_id: itineraries[5].id, created_at: new Date() }, // Sofia's Norway
        { user_id: users[4].id, itinerary_id: itineraries[12].id, created_at: new Date() }, // Ava's Swiss Alps
        
        // Ethan (history buff)
        { user_id: users[5].id, itinerary_id: itineraries[0].id, created_at: new Date() }, // Emma's Rome
        { user_id: users[5].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // Liam's Kyoto
        { user_id: users[5].id, itinerary_id: itineraries[13].id, created_at: new Date() }, // Ava's Vienna
        
        // Ava (likes culture and arts)
        { user_id: users[6].id, itinerary_id: itineraries[14].id, created_at: new Date() }, // Lucas's Paris
        { user_id: users[6].id, itinerary_id: itineraries[1].id, created_at: new Date() }, // Emma's Barcelona
        { user_id: users[6].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        { user_id: users[6].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // Liam's Kyoto
        
        // Lucas (foodie, likes culinary destinations)
        { user_id: users[7].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        { user_id: users[7].id, itinerary_id: itineraries[7].id, created_at: new Date() }, // Noah's Mumbai
        { user_id: users[7].id, itinerary_id: itineraries[15].id, created_at: new Date() }, // His own Provence
        { user_id: users[7].id, itinerary_id: itineraries[1].id, created_at: new Date() }, // Emma's Barcelona
      ];

      await likesCollection.insertMany(likes);
      console.log(`✅ Created ${likes.length} likes in MongoDB\n`);
    } catch (error) {
      console.error('⚠️  Warning: Could not seed MongoDB likes:', error.message);
      console.log('   Make sure MongoDB is running and MONGODB_URI is set correctly\n');
    } finally {
      await mongoClient.close();
    }
  } else {
    console.log('⚠️  Skipping MongoDB likes - MONGODB_URI not configured\n');
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • ${users.length} users created`);
  console.log(`   • ${itineraries.length} itineraries created`);
  console.log(`   • ${comments.length} comments created`);
  console.log('   • Likes created in MongoDB (if configured)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
