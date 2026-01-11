import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const logger = new Logger('TenantServiceSeeder');

/**
 * Automatic Database Seeding for Tenant Service
 * Runs on every deployment to ensure:
 * 1. Default tenant exists (Free Community)
 */
async function seed() {
  logger.log('🌱 Starting automatic database seeding...');

  try {
    // Seed Default Tenant (Free Community)
    logger.log('🏢 Seeding default tenant...');

    const freeTenantName = process.env.FREE_TENANT_NAME || 'Free Community';
    const tenantEmail = process.env.FREE_TENANT_EMAIL || 'free@example.local';
    const tenantPassword = process.env.FREE_TENANT_PASSWORD || 'changeme';
    const tenantNamespace = process.env.FREE_TENANT_NAMESPACE || 'free-community';

    // Check if tenant already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { name: freeTenantName },
    });

    if (existingTenant) {
      logger.log(`  ✓ Default tenant already exists: ${existingTenant.name} (UUID: ${existingTenant.uuid})`);
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(tenantPassword, 10);

      const tenant = await prisma.tenant.create({
        data: {
          name: freeTenantName,
          email: tenantEmail,
          password: hashedPassword,
          namespace: tenantNamespace,
          tier: 'free',
        },
      });

      logger.log(`  ✓ Created default tenant: ${tenant.name} (UUID: ${tenant.uuid})`);
    }

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
