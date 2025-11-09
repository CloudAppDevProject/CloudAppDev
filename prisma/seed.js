import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data from PostgreSQL
  console.log('🗑️  Clearing existing PostgreSQL data...');
  await prisma.itinerary.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Existing PostgreSQL data cleared');

  // Clear existing data from MongoDB
  console.log('🗑️  Clearing existing MongoDB data...');
  if (MONGODB_URI) {
    const mongoClient = new MongoClient(MONGODB_URI);
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.MONGO_INITDB_DATABASE || 'clouddev');
      await db.collection('comments').deleteMany({});
      await db.collection('likes').deleteMany({});
      console.log('✅ Existing MongoDB data cleared');
    } catch (err) {
      console.log('⚠️  MongoDB clearing skipped:', err.message);
    } finally {
      await mongoClient.close();
    }
  }
  console.log();

  // Create diverse users (mix of Google Auth and traditional)
  console.log('👥 Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@example.com',
        password: 'password123', // Traditional auth
      },
    }),
    prisma.user.create({
      data: {
        name: 'Liam Chen',
        email: 'liam.chen@example.com',
        googleUid: 'google_liam_uid_001',
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
        googleUid: 'google_noah_uid_002',
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
        googleUid: 'google_ethan_uid_003',
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
        googleUid: 'google_lucas_uid_004',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Maria Garcia',
        email: 'maria.garcia@example.com',
        password: 'password123',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Yuki Tanaka',
        email: 'yuki.tanaka@example.com',
        googleUid: 'google_yuki_uid_005',
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} users (mix of Google Auth & traditional)\n`);

  // Create realistic itineraries with locations
  console.log('✈️  Creating itineraries with locations...');
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
              images: ['locations/vatican_sistine_1.jpg', 'locations/vatican_basilica_1.jpg'],
            },
            {
              name: 'Trastevere & Historic Center',
              start_date: '2025-03-19',
              end_date: '2025-03-20',
              short_desc: 'Charming neighborhood with authentic restaurants',
              images: ['locations/rome_trastevere_1.jpg', 'locations/rome_trevi_1.jpg'],
            },
            {
              name: 'Day Trip to Pompeii',
              start_date: '2025-03-21',
              end_date: '2025-03-21',
              short_desc: 'Ancient city preserved by volcanic ash',
              images: ['locations/pompeii_ruins_1.jpg', 'locations/pompeii_vesuvius_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Sagrada Familia',
              start_date: '2025-05-20',
              end_date: '2025-05-20',
              short_desc: 'Gaudí\'s unfinished masterpiece basilica',
              images: ['locations/barcelona_sagrada_1.jpg', 'locations/barcelona_sagrada_2.jpg'],
            },
            {
              name: 'Park Güell',
              start_date: '2025-05-21',
              end_date: '2025-05-21',
              short_desc: 'Colorful mosaic park with city views',
              images: ['locations/barcelona_park_guell_1.jpg', 'locations/barcelona_park_guell_2.jpg'],
            },
            {
              name: 'Gothic Quarter & Las Ramblas',
              start_date: '2025-05-22',
              end_date: '2025-05-23',
              short_desc: 'Medieval streets and vibrant boulevard',
              images: ['locations/barcelona_gothic_1.jpg', 'locations/barcelona_ramblas_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Senso-ji Temple & Asakusa',
              start_date: '2025-04-10',
              end_date: '2025-04-11',
              short_desc: 'Tokyo\'s oldest Buddhist temple',
              images: ['locations/tokyo_sensoji_1.jpg', 'locations/tokyo_asakusa_1.jpg'],
            },
            {
              name: 'Akihabara Electric Town',
              start_date: '2025-04-11',
              end_date: '2025-04-12',
              short_desc: 'Gaming, anime, and electronics district',
              images: ['locations/tokyo_akihabara_1.jpg', 'locations/tokyo_akihabara_2.jpg'],
            },
            {
              name: 'Ueno Park Cherry Blossoms',
              start_date: '2025-04-13',
              end_date: '2025-04-14',
              short_desc: 'Hanami viewing under sakura trees',
              images: ['locations/tokyo_ueno_sakura_1.jpg', 'locations/tokyo_ueno_sakura_2.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Fushimi Inari Shrine',
              start_date: '2025-04-18',
              end_date: '2025-04-19',
              short_desc: 'Thousands of vermillion torii gates',
              images: ['locations/kyoto_fushimi_1.jpg', 'locations/kyoto_fushimi_2.jpg'],
            },
            {
              name: 'Arashiyama Bamboo Grove',
              start_date: '2025-04-20',
              end_date: '2025-04-21',
              short_desc: 'Serene bamboo forest path',
              images: ['locations/kyoto_bamboo_1.jpg', 'locations/kyoto_bamboo_2.jpg'],
            },
            {
              name: 'Traditional Tea Ceremony',
              start_date: '2025-04-22',
              end_date: '2025-04-22',
              short_desc: 'Authentic matcha tea experience',
              images: ['locations/kyoto_tea_ceremony_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Golden Circle - Gullfoss',
              start_date: '2025-06-05',
              end_date: '2025-06-06',
              short_desc: 'Majestic two-tier waterfall',
              images: ['locations/iceland_gullfoss_1.jpg', 'locations/iceland_gullfoss_2.jpg'],
            },
            {
              name: 'Geysir Geothermal Area',
              start_date: '2025-06-06',
              end_date: '2025-06-07',
              short_desc: 'Active geysers and hot springs',
              images: ['locations/iceland_geysir_1.jpg', 'locations/iceland_geysir_2.jpg'],
            },
            {
              name: 'Blue Lagoon',
              start_date: '2025-06-08',
              end_date: '2025-06-09',
              short_desc: 'Geothermal spa in lava field',
              images: ['locations/iceland_blue_lagoon_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Bergen Bryggen Wharf',
              start_date: '2025-07-12',
              end_date: '2025-07-13',
              short_desc: 'UNESCO World Heritage colorful buildings',
              images: ['locations/norway_bryggen_1.jpg', 'locations/norway_bryggen_2.jpg'],
            },
            {
              name: 'Sognefjord Cruise',
              start_date: '2025-07-14',
              end_date: '2025-07-15',
              short_desc: 'Norway\'s longest and deepest fjord',
              images: ['locations/norway_sognefjord_1.jpg', 'locations/norway_sognefjord_2.jpg'],
            },
            {
              name: 'Trolltunga Hike',
              start_date: '2025-07-16',
              end_date: '2025-07-17',
              short_desc: 'Iconic cliff hanging over lake',
              images: ['locations/norway_trolltunga_1.jpg', 'locations/norway_trolltunga_2.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Bangkok Temples & Street Food',
              start_date: '2025-11-01',
              end_date: '2025-11-07',
              short_desc: 'Grand Palace, Wat Pho, floating markets',
              images: ['locations/bangkok_temple_1.jpg', 'locations/bangkok_street_food_1.jpg'],
            },
            {
              name: 'Chiang Mai Elephant Sanctuary',
              start_date: '2025-11-08',
              end_date: '2025-11-14',
              short_desc: 'Ethical elephant encounters in mountains',
              images: ['locations/chiangmai_elephants_1.jpg', 'locations/chiangmai_temple_1.jpg'],
            },
            {
              name: 'Ha Long Bay, Vietnam',
              start_date: '2025-11-20',
              end_date: '2025-11-23',
              short_desc: 'Limestone karsts and emerald waters',
              images: ['locations/halong_bay_1.jpg', 'locations/halong_bay_2.jpg'],
            },
            {
              name: 'Angkor Wat, Cambodia',
              start_date: '2025-01-15',
              end_date: '2025-01-20',
              short_desc: 'Ancient temple complex at sunrise',
              images: ['locations/angkor_wat_1.jpg', 'locations/angkor_wat_2.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Chowpatty Beach Street Food',
              start_date: '2025-09-15',
              end_date: '2025-09-16',
              short_desc: 'Pani puri, bhel puri, and sunset views',
              images: ['locations/mumbai_chowpatty_1.jpg', 'locations/mumbai_street_food_1.jpg'],
            },
            {
              name: 'Crawford Market & Spice Bazaar',
              start_date: '2025-09-17',
              end_date: '2025-09-18',
              short_desc: 'Colonial-era market with spices and produce',
              images: ['locations/mumbai_crawford_1.jpg', 'locations/mumbai_spices_1.jpg'],
            },
            {
              name: 'Bollywood Studio Tour',
              start_date: '2025-09-19',
              end_date: '2025-09-20',
              short_desc: 'Behind the scenes of Indian cinema',
              images: ['locations/mumbai_bollywood_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Queenstown Adventure Sports',
              start_date: '2025-12-05',
              end_date: '2025-12-08',
              short_desc: 'Bungee jumping, skiing, and lake views',
              images: ['locations/queenstown_bungee_1.jpg', 'locations/queenstown_lake_1.jpg'],
            },
            {
              name: 'Milford Sound Cruise',
              start_date: '2025-12-09',
              end_date: '2025-12-10',
              short_desc: 'Fiordland\'s dramatic waterfalls and peaks',
              images: ['locations/milford_sound_1.jpg', 'locations/milford_sound_2.jpg'],
            },
            {
              name: 'Lake Tekapo Stargazing',
              start_date: '2025-12-11',
              end_date: '2025-12-12',
              short_desc: 'Dark Sky Reserve with stunning night skies',
              images: ['locations/tekapo_church_1.jpg', 'locations/tekapo_stars_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Great Barrier Reef Diving',
              start_date: '2026-01-15',
              end_date: '2026-01-17',
              short_desc: 'World\'s largest coral reef system',
              images: ['locations/barrier_reef_1.jpg', 'locations/barrier_reef_2.jpg'],
            },
            {
              name: 'Daintree Rainforest',
              start_date: '2026-01-18',
              end_date: '2026-01-19',
              short_desc: 'Ancient tropical rainforest meets reef',
              images: ['locations/daintree_1.jpg', 'locations/daintree_2.jpg'],
            },
            {
              name: 'Indigenous Cultural Center',
              start_date: '2026-01-20',
              end_date: '2026-01-20',
              short_desc: 'Aboriginal art and traditions',
              images: ['locations/cairns_aboriginal_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Moscow Red Square',
              start_date: '2025-08-01',
              end_date: '2025-08-02',
              short_desc: 'Kremlin, St. Basil\'s Cathedral',
              images: ['locations/moscow_red_square_1.jpg', 'locations/moscow_cathedral_1.jpg'],
            },
            {
              name: 'Lake Baikal, Irkutsk',
              start_date: '2025-08-05',
              end_date: '2025-08-06',
              short_desc: 'World\'s deepest and oldest lake',
              images: ['locations/baikal_lake_1.jpg', 'locations/baikal_lake_2.jpg'],
            },
            {
              name: 'Vladivostok Terminus',
              start_date: '2025-08-07',
              end_date: '2025-08-08',
              short_desc: 'Pacific port city, journey\'s end',
              images: ['locations/vladivostok_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Krakow Old Town & Main Square',
              start_date: '2025-05-08',
              end_date: '2025-05-09',
              short_desc: 'Medieval market square and St. Mary\'s Basilica',
              images: ['locations/krakow_square_1.jpg', 'locations/krakow_basilica_1.jpg'],
            },
            {
              name: 'Wieliczka Salt Mine',
              start_date: '2025-05-10',
              end_date: '2025-05-10',
              short_desc: 'Underground chapels carved from salt',
              images: ['locations/wieliczka_mine_1.jpg', 'locations/wieliczka_chapel_1.jpg'],
            },
            {
              name: 'Kazimierz Jewish Quarter',
              start_date: '2025-05-11',
              end_date: '2025-05-12',
              short_desc: 'Historic district with vibrant nightlife',
              images: ['locations/kazimierz_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Matterhorn Glacier Paradise',
              start_date: '2025-02-10',
              end_date: '2025-02-13',
              short_desc: 'Highest cable car station in Europe',
              images: ['locations/zermatt_matterhorn_1.jpg', 'locations/zermatt_skiing_1.jpg'],
            },
            {
              name: 'Gornergrat Railway',
              start_date: '2025-02-14',
              end_date: '2025-02-15',
              short_desc: 'Scenic cog railway with mountain views',
              images: ['locations/zermatt_gornergrat_1.jpg'],
            },
            {
              name: 'Zermatt Village',
              start_date: '2025-02-15',
              end_date: '2025-02-16',
              short_desc: 'Car-free alpine village charm',
              images: ['locations/zermatt_village_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Vienna State Opera',
              start_date: '2025-04-22',
              end_date: '2025-04-23',
              short_desc: 'World-renowned opera house performance',
              images: ['locations/vienna_opera_1.jpg', 'locations/vienna_opera_2.jpg'],
            },
            {
              name: 'Schönbrunn Palace',
              start_date: '2025-04-24',
              end_date: '2025-04-25',
              short_desc: 'Imperial summer residence with gardens',
              images: ['locations/vienna_schonbrunn_1.jpg', 'locations/vienna_schonbrunn_2.jpg'],
            },
            {
              name: 'Viennese Coffee Houses',
              start_date: '2025-04-26',
              end_date: '2025-04-26',
              short_desc: 'Historic cafés and Sachertorte',
              images: ['locations/vienna_cafe_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Louvre Museum',
              start_date: '2025-03-03',
              end_date: '2025-03-04',
              short_desc: 'Mona Lisa and world-famous art collection',
              images: ['locations/paris_louvre_1.jpg', 'locations/paris_louvre_2.jpg'],
            },
            {
              name: 'Montmartre & Sacré-Cœur',
              start_date: '2025-03-05',
              end_date: '2025-03-06',
              short_desc: 'Artists\' quarter with hilltop basilica',
              images: ['locations/paris_montmartre_1.jpg', 'locations/paris_sacre_coeur_1.jpg'],
            },
            {
              name: 'Versailles Palace',
              start_date: '2025-03-07',
              end_date: '2025-03-07',
              short_desc: 'Opulent royal palace and gardens',
              images: ['locations/versailles_palace_1.jpg', 'locations/versailles_gardens_1.jpg'],
            },
          ],
        },
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
        locations: {
          create: [
            {
              name: 'Valensole Lavender Fields',
              start_date: '2025-07-05',
              end_date: '2025-07-07',
              short_desc: 'Endless purple lavender rows at peak bloom',
              images: ['locations/provence_lavender_1.jpg', 'locations/provence_lavender_2.jpg'],
            },
            {
              name: 'Gordes & Roussillon Villages',
              start_date: '2025-07-08',
              end_date: '2025-07-09',
              short_desc: 'Picturesque hilltop stone villages',
              images: ['locations/provence_gordes_1.jpg', 'locations/provence_roussillon_1.jpg'],
            },
            {
              name: 'Châteauneuf-du-Pape Wineries',
              start_date: '2025-07-10',
              end_date: '2025-07-11',
              short_desc: 'World-famous wine region tastings',
              images: ['locations/provence_wine_1.jpg'],
            },
          ],
        },
      },
    }),
    
    // Maria's itineraries (new user)
    prisma.itinerary.create({
      data: {
        user_id: users[8].id,
        title: 'Costa Rica Eco Adventure',
        destination: 'San José, Costa Rica',
        start_date: '2025-08-15',
        short_desc: 'Rainforests, beaches, and wildlife',
        detail_desc: 'Zip-lining through Monteverde Cloud Forest, relaxing on Caribbean beaches, visiting Arenal Volcano hot springs, spotting sloths and toucans, and learning about sustainable eco-tourism.',
        locations: {
          create: [
            {
              name: 'Monteverde Cloud Forest',
              start_date: '2025-08-15',
              end_date: '2025-08-17',
              short_desc: 'Canopy zip-lining and hanging bridges',
              images: ['locations/costarica_monteverde_1.jpg', 'locations/costarica_zipline_1.jpg'],
            },
            {
              name: 'Arenal Volcano',
              start_date: '2025-08-18',
              end_date: '2025-08-20',
              short_desc: 'Active volcano with hot springs',
              images: ['locations/costarica_arenal_1.jpg', 'locations/costarica_hotsprings_1.jpg'],
            },
          ],
        },
      },
    }),
    
    // Yuki's itineraries (new user)
    prisma.itinerary.create({
      data: {
        user_id: users[9].id,
        title: 'Seoul Modern Culture Trip',
        destination: 'Seoul, South Korea',
        start_date: '2025-10-01',
        short_desc: 'K-pop, tech, and traditional palaces',
        detail_desc: 'Exploring Gangnam district, visiting Gyeongbokgung Palace, shopping in Myeongdong, experiencing Korean BBQ and street food, attending K-pop concert, and relaxing in Korean spa (jjimjilbang).',
        locations: {
          create: [
            {
              name: 'Gyeongbokgung Palace',
              start_date: '2025-10-01',
              end_date: '2025-10-02',
              short_desc: 'Grand Joseon Dynasty palace',
              images: ['locations/seoul_palace_1.jpg', 'locations/seoul_palace_2.jpg'],
            },
            {
              name: 'Gangnam & K-pop District',
              start_date: '2025-10-03',
              end_date: '2025-10-04',
              short_desc: 'Modern Seoul, entertainment companies',
              images: ['locations/seoul_gangnam_1.jpg', 'locations/seoul_kpop_1.jpg'],
            },
            {
              name: 'Myeongdong Shopping Street',
              start_date: '2025-10-05',
              end_date: '2025-10-05',
              short_desc: 'K-beauty products and street food',
              images: ['locations/seoul_myeongdong_1.jpg'],
            },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${itineraries.length} itineraries with locations\n`);

  // Create realistic comments in MongoDB
  console.log('💬 Creating comments in MongoDB...');
  if (MONGODB_URI) {
    const mongoClient = new MongoClient(MONGODB_URI);
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.MONGO_INITDB_DATABASE || 'clouddev');
      const commentsCollection = db.collection('comments');

      const commentData = [
        // Comments on Emma's Rome trip
        { userId: users[1].id, userName: users[1].name, userEmail: users[1].email, itineraryId: itineraries[0].id, content: 'Rome is absolutely magical! Make sure to book your Colosseum tickets in advance to skip the lines. Also, don\'t miss the sunset view from Gianicolo Hill!' },
        { userId: users[3].id, userName: users[3].name, userEmail: users[3].email, itineraryId: itineraries[0].id, content: 'If you have time, take a day trip to Tivoli to see Villa d\'Este. The gardens are stunning! Also, try the gelato at Giolitti - it\'s been there since 1900.' },
        { userId: users[0].id, userName: users[0].name, userEmail: users[0].email, itineraryId: itineraries[0].id, content: 'Thanks for the tips! I\'ve already booked Colosseum tickets. Will definitely add Tivoli to the plan!' },

        // Comments on Liam's Tokyo trip
        { userId: users[6].id, userName: users[6].name, userEmail: users[6].email, itineraryId: itineraries[2].id, content: 'Tokyo is incredible! Don\'t miss the robot restaurant in Shinjuku - it\'s wild. Also, get a JR Pass if you\'re planning to visit Kyoto too.' },
        { userId: users[4].id, userName: users[4].name, userEmail: users[4].email, itineraryId: itineraries[2].id, content: 'For the best sushi experience, try Sushi Dai at Toyosu Market (moved from Tsukiji). Worth the early morning wait!' },

        // Comments on Sofia's Iceland trip
        { userId: users[2].id, userName: users[2].name, userEmail: users[2].email, itineraryId: itineraries[4].id, content: 'So excited for this trip! Anyone have recommendations for hiking gear rental in Reykjavik?' },
        { userId: users[5].id, userName: users[5].name, userEmail: users[5].email, itineraryId: itineraries[4].id, content: 'Check out Iceland Mountain Guides - they rent quality gear and also offer guided tours if you want. The weather can change quickly, so layers are essential!' },

        // Comments on Noah's Southeast Asia trip
        { userId: users[7].id, userName: users[7].name, userEmail: users[7].email, itineraryId: itineraries[6].id, content: 'This sounds amazing! I did a similar route last year. In Bangkok, stay in Khao San Road area for the backpacker vibe. Also, Pai in northern Thailand is a hidden gem!' },
        { userId: users[0].id, userName: users[0].name, userEmail: users[0].email, itineraryId: itineraries[6].id, content: 'Three months! That\'s the dream. Make sure to get travel insurance that covers multiple countries. SafetyWing is popular with backpackers.' },
        { userId: users[3].id, userName: users[3].name, userEmail: users[3].email, itineraryId: itineraries[6].id, content: 'Thanks for the advice! I\'ll check out Pai and definitely getting comprehensive insurance.' },

        // Comments on Olivia's New Zealand trip
        { userId: users[1].id, userName: users[1].name, userEmail: users[1].email, itineraryId: itineraries[8].id, content: 'New Zealand is on my bucket list! Are you renting a campervan or car? I\'ve heard campervans give you so much freedom.' },
        { userId: users[4].id, userName: users[4].name, userEmail: users[4].email, itineraryId: itineraries[8].id, content: 'Going with a campervan! Booked through Jucy - they have great deals and the freedom to stay at DOC campsites is worth it.' },

        // Comments on Ethan's Trans-Siberian trip
        { userId: users[2].id, userName: users[2].name, userEmail: users[2].email, itineraryId: itineraries[10].id, content: 'This is such a unique trip! How did you manage to get the Russian visa? I heard it\'s quite complicated.' },
        { userId: users[5].id, userName: users[5].name, userEmail: users[5].email, itineraryId: itineraries[10].id, content: 'Used an agency called Real Russia - they handle all the visa paperwork and train bookings. Made it much easier!' },

        // Comments on Ava's Vienna trip
        { userId: users[7].id, userName: users[7].name, userEmail: users[7].email, itineraryId: itineraries[13].id, content: 'Vienna is beautiful! If you love classical music, try to get standing room tickets at the Opera - they\'re only €10 and the acoustics are amazing from anywhere.' },
        { userId: users[6].id, userName: users[6].name, userEmail: users[6].email, itineraryId: itineraries[13].id, content: 'That\'s a great tip! I didn\'t know about the standing room tickets. Definitely doing that!' },

        // Comments on Lucas's Paris trip
        { userId: users[0].id, userName: users[0].name, userEmail: users[0].email, itineraryId: itineraries[14].id, content: 'Paris during Fashion Week must be incredible! Are you going to any shows or just soaking in the atmosphere?' },
        { userId: users[4].id, userName: users[4].name, userEmail: users[4].email, itineraryId: itineraries[14].id, content: 'Don\'t miss the Musée de l\'Orangerie for Monet\'s Water Lilies - it\'s less crowded than the main museums but equally stunning.' },
        { userId: users[7].id, userName: users[7].name, userEmail: users[7].email, itineraryId: itineraries[14].id, content: '@Emma - Got tickets to two shows through connections! @Olivia - Thanks, adding it to my list!' },

        // Comments on Maria's Costa Rica trip
        { userId: users[4].id, userName: users[4].name, userEmail: users[4].email, itineraryId: itineraries[16].id, content: 'Costa Rica is amazing for adventure! The zip-lining in Monteverde is absolutely thrilling. Make sure to do the night walk in the cloud forest too!' },
        { userId: users[3].id, userName: users[3].name, userEmail: users[3].email, itineraryId: itineraries[16].id, content: 'Love the eco-tourism focus! Costa Rica does sustainable tourism so well. Don\'t miss the sloth sanctuary!' },
        { userId: users[8].id, userName: users[8].name, userEmail: users[8].email, itineraryId: itineraries[16].id, content: 'Thanks for the tips! Night walk sounds incredible, definitely adding that to the plan!' },

        // Comments on Yuki's Seoul trip
        { userId: users[1].id, userName: users[1].name, userEmail: users[1].email, itineraryId: itineraries[17].id, content: 'Seoul is fantastic! The food scene is incredible - try Korean fried chicken and visit a pojangmacha (street food tent). Also, Bukchon Hanok Village is beautiful!' },
        { userId: users[6].id, userName: users[6].name, userEmail: users[6].email, itineraryId: itineraries[17].id, content: 'So jealous! Korean skincare shopping in Myeongdong is the best. Stock up on sheet masks and try the makeup stores!' },
        { userId: users[9].id, userName: users[9].name, userEmail: users[9].email, itineraryId: itineraries[17].id, content: 'Already making a list of all the food I want to try! And yes, my suitcase will be full of K-beauty products 😄' },

        // Cross-comments showing community engagement
        { userId: users[8].id, userName: users[8].name, userEmail: users[8].email, itineraryId: itineraries[2].id, content: 'Your photos of the cherry blossoms are stunning! 🌸 When is the best time to see them?' },
        { userId: users[9].id, userName: users[9].name, userEmail: users[9].email, itineraryId: itineraries[1].id, content: 'Gaudí\'s architecture is on my bucket list! Did you book Park Güell tickets in advance?' },
      ];

      const mongoComments = commentData.map(comment => ({
        user_id: comment.userId,
        itinerary_id: comment.itineraryId,
        content: comment.content,
        created_at: new Date(),
        user: {
          id: comment.userId,
          name: comment.userName,
          email: comment.userEmail
        }
      }));

      const result = await commentsCollection.insertMany(mongoComments);
      console.log(`✅ Created ${result.insertedCount} comments in MongoDB\n`);
    } catch (err) {
      console.log('⚠️  MongoDB comments seeding skipped:', err.message);
    } finally {
      await mongoClient.close();
    }
  } else {
    console.log('⚠️  MongoDB URI not set, skipping comments seeding\n');
  }

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
        { user_id: users[0].id, itinerary_id: itineraries[15].id, created_at: new Date() }, // Lucas's Provence
        
        // Liam (likes Asian destinations)
        { user_id: users[1].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // His own Kyoto trip
        { user_id: users[1].id, itinerary_id: itineraries[6].id, created_at: new Date() }, // Noah's SE Asia
        { user_id: users[1].id, itinerary_id: itineraries[7].id, created_at: new Date() }, // Noah's Mumbai
        { user_id: users[1].id, itinerary_id: itineraries[17].id, created_at: new Date() }, // Yuki's Seoul
        
        // Sofia (likes Nordic destinations)
        { user_id: users[2].id, itinerary_id: itineraries[5].id, created_at: new Date() }, // Her own Norway trip
        { user_id: users[2].id, itinerary_id: itineraries[12].id, created_at: new Date() }, // Ava's Swiss Alps
        { user_id: users[2].id, itinerary_id: itineraries[8].id, created_at: new Date() }, // Olivia's NZ
        
        // Noah (adventurous, likes diverse trips)
        { user_id: users[3].id, itinerary_id: itineraries[8].id, created_at: new Date() }, // Olivia's NZ
        { user_id: users[3].id, itinerary_id: itineraries[10].id, created_at: new Date() }, // Ethan's Trans-Siberian
        { user_id: users[3].id, itinerary_id: itineraries[4].id, created_at: new Date() }, // Sofia's Iceland
        { user_id: users[3].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        { user_id: users[3].id, itinerary_id: itineraries[16].id, created_at: new Date() }, // Maria's Costa Rica
        
        // Olivia (likes nature and adventure)
        { user_id: users[4].id, itinerary_id: itineraries[4].id, created_at: new Date() }, // Sofia's Iceland
        { user_id: users[4].id, itinerary_id: itineraries[5].id, created_at: new Date() }, // Sofia's Norway
        { user_id: users[4].id, itinerary_id: itineraries[12].id, created_at: new Date() }, // Ava's Swiss Alps
        { user_id: users[4].id, itinerary_id: itineraries[16].id, created_at: new Date() }, // Maria's Costa Rica
        { user_id: users[4].id, itinerary_id: itineraries[9].id, created_at: new Date() }, // Her own Australia trip
        
        // Ethan (history buff)
        { user_id: users[5].id, itinerary_id: itineraries[0].id, created_at: new Date() }, // Emma's Rome
        { user_id: users[5].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // Liam's Kyoto
        { user_id: users[5].id, itinerary_id: itineraries[13].id, created_at: new Date() }, // Ava's Vienna
        { user_id: users[5].id, itinerary_id: itineraries[14].id, created_at: new Date() }, // Lucas's Paris
        
        // Ava (likes culture and arts)
        { user_id: users[6].id, itinerary_id: itineraries[14].id, created_at: new Date() }, // Lucas's Paris
        { user_id: users[6].id, itinerary_id: itineraries[1].id, created_at: new Date() }, // Emma's Barcelona
        { user_id: users[6].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        { user_id: users[6].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // Liam's Kyoto
        { user_id: users[6].id, itinerary_id: itineraries[17].id, created_at: new Date() }, // Yuki's Seoul
        
        // Lucas (foodie, likes culinary destinations)
        { user_id: users[7].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        { user_id: users[7].id, itinerary_id: itineraries[7].id, created_at: new Date() }, // Noah's Mumbai
        { user_id: users[7].id, itinerary_id: itineraries[15].id, created_at: new Date() }, // His own Provence
        { user_id: users[7].id, itinerary_id: itineraries[1].id, created_at: new Date() }, // Emma's Barcelona
        { user_id: users[7].id, itinerary_id: itineraries[17].id, created_at: new Date() }, // Yuki's Seoul
        
        // Maria (eco-conscious, likes nature)
        { user_id: users[8].id, itinerary_id: itineraries[4].id, created_at: new Date() }, // Sofia's Iceland
        { user_id: users[8].id, itinerary_id: itineraries[5].id, created_at: new Date() }, // Sofia's Norway
        { user_id: users[8].id, itinerary_id: itineraries[8].id, created_at: new Date() }, // Olivia's NZ
        { user_id: users[8].id, itinerary_id: itineraries[9].id, created_at: new Date() }, // Olivia's Australia
        
        // Yuki (likes Asian and modern cities)
        { user_id: users[9].id, itinerary_id: itineraries[2].id, created_at: new Date() }, // Liam's Tokyo
        { user_id: users[9].id, itinerary_id: itineraries[3].id, created_at: new Date() }, // Liam's Kyoto
        { user_id: users[9].id, itinerary_id: itineraries[6].id, created_at: new Date() }, // Noah's SE Asia
        { user_id: users[9].id, itinerary_id: itineraries[1].id, created_at: new Date() }, // Emma's Barcelona
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

  // Count locations
  let totalLocations = 0;
  for (const itinerary of itineraries) {
    const locationCount = await prisma.location.count({
      where: { itinerary_id: itinerary.id }
    });
    totalLocations += locationCount;
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • ${users.length} users created (${users.filter(u => u.googleUid).length} with Google Auth)`);
  console.log(`   • ${itineraries.length} itineraries created`);
  console.log(`   • ${totalLocations} locations created across all itineraries`);
  console.log('   • 27 comments created in MongoDB');
  console.log('   • 43 likes created in MongoDB\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
