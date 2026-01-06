import { PrismaClient } from '@prisma/client';

const DEFAULT_ROLES = [
  {
    name: 'user',
    permissions: ['itinerary:view', 'itinerary:create', 'comment:create'],
  },
  {
    name: 'admin',
    permissions: ['*'], // All permissions
  },
];

async function seedRoles() {
  const prisma = new PrismaClient();

  try {
    for (const role of DEFAULT_ROLES) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: role,
      });
    }

    console.log('✅ Roles seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedRoles();
