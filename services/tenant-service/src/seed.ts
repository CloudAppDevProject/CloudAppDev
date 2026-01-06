import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();
const logger = new Logger('TenantServiceSeeder');

/**
 * Automatic Database Seeding for Tenant Service
 * Runs on every deployment to ensure:
 * 1. Default roles exist (user, admin)
 * 2. Default tenant exists (Free Community)
 */
async function seed() {
  logger.log('🌱 Starting automatic database seeding...');

  try {
    // 1. Seed Roles
    logger.log('📋 Seeding roles...');

    const roles = [
      { 
        id: 1, 
        name: 'user', 
        permissions: ['itinerary:create', 'itinerary:read', 'itinerary:update', 'itinerary:delete']
      },
      { 
        id: 2, 
        name: 'admin', 
        permissions: ['*'] // Admin has all permissions
      },
    ];

    for (const roleData of roles) {
      const existingRole = await prisma.role.findUnique({
        where: { id: roleData.id },
      });

      if (existingRole) {
        logger.log(`  ✓ Role '${roleData.name}' already exists (ID: ${roleData.id})`);
      } else {
        const role = await prisma.role.create({ data: roleData });
        logger.log(`  ✓ Created role '${role.name}' (ID: ${role.id})`);
      }
    }

    // 2. Seed Default Tenant (Free Community)
    logger.log('🏢 Seeding default tenant...');

    const freeTenantName = process.env.FREE_TENANT_NAME || 'Free Community';

    const defaultTenantData = {
      id: 1,
      name: freeTenantName,
      tier: 'free',
      maxUsers: 999999, // Unlimited users for free community
    };

    const existingTenant = await prisma.tenant.findUnique({
      where: { id: defaultTenantData.id },
    });

    if (existingTenant) {
      logger.log(`  ✓ Default tenant already exists: ${existingTenant.name} (ID: ${existingTenant.id})`);
    } else {
      const tenant = await prisma.tenant.create({ data: defaultTenantData });
      logger.log(`  ✓ Created default tenant: ${tenant.name} (ID: ${tenant.id})`);
    }

    // 3. Fix PostgreSQL sequences after seeding with explicit IDs
    logger.log('🔧 Resetting PostgreSQL sequences...');

    // Reset tenant sequence to highest ID + 1
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('tenants', 'id'), COALESCE((SELECT MAX(id) FROM tenants), 1), true)`;
    logger.log('  ✓ Tenant sequence reset');

    // Reset role sequence to highest ID + 1
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 1), true)`;
    logger.log('  ✓ Role sequence reset');

    logger.log('✅ Automatic database seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Automatic database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seed()
  .then(() => {
    logger.log('🎉 Database is ready!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  });
