import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Example',
      email: 'alice@example.com',
      password: 'password123',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Example',
      email: 'bob@example.com',
      password: 'password456',
    },
  });

  // Create itineraries for Alice
  await prisma.itinerary.createMany({
    data: [
      {
        user_id: alice.id,
        title: 'Trip to Paris',
        destination: 'Paris',
        start_date: '2024-07-01',
        short_desc: 'A romantic getaway',
        detail_desc: 'Visiting the Eiffel Tower, Louvre, and more.',
      },
      {
        user_id: alice.id,
        title: 'Hiking in the Alps',
        destination: 'Swiss Alps',
        start_date: '2024-08-15',
        short_desc: 'Mountain adventure',
        detail_desc: 'Exploring trails and enjoying nature.',
      },
    ],
  });

  // Create itineraries for Bob
  await prisma.itinerary.create({
    data: {
      user_id: bob.id,
      title: 'Tokyo Food Tour',
      destination: 'Tokyo',
      start_date: '2024-09-10',
      short_desc: 'Culinary exploration',
      detail_desc: 'Sampling sushi, ramen, and street food.',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
