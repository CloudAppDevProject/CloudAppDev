import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the default "Free Community" tenant
 * All new users are automatically assigned to this tenant
 */
async function seedDefaultTenant() {
  console.log('🌱 Seeding default tenant...');

  try {
    // Check if default tenant already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { name: 'Free Community' },
    });

    if (existingTenant) {
      console.log('✓ Default tenant already exists:', existingTenant);
      return existingTenant;
    }

    // Create default tenant with ID 1 for easy reference
    const defaultTenant = await prisma.tenant.create({
      data: {
        id: 1,
        name: 'Free Community',
        tier: 'free',
        maxUsers: 999999, // Unlimited for free community
      },
    });

    console.log('✓ Default tenant created:', defaultTenant);
    return defaultTenant;
  } catch (error) {
    console.error('❌ Error seeding default tenant:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  seedDefaultTenant()
    .then(() => {
      console.log('✓ Default tenant seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Default tenant seeding failed:', error);
      process.exit(1);
    });
}

export default seedDefaultTenant;
