import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const logger = new Logger('TenantServiceSeeder');

/**
 * Automatic Database Seeding for Tenant Service
 * Runs on every deployment to ensure:
 * 1. Default tenant exists (Free Community)
 * 2. Test tenants exist for local development (acme, testcorp, enterprise1)
 */
async function seed() {
  logger.log('🌱 Starting automatic database seeding...');

  try {
    // Seed Default Tenant (Free Community)
    logger.log('🏢 Seeding default tenant...');

    const freeTenantName = process.env.FREE_TENANT_NAME || 'Free Community';
    const tenantEmail = process.env.FREE_TENANT_EMAIL || 'free@example.local';
    const tenantPassword = process.env.FREE_TENANT_PASSWORD || 'changeme';
    const tenantNamespace = process.env.FREE_TENANT_NAMESPACE || 'free';

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

    // Seed Test Tenants for local development
    if (process.env.NODE_ENV === 'development' || process.env.SEED_TEST_TENANTS === 'true') {
      logger.log('🧪 Seeding test tenants for development...');

      const testTenants = [
        { name: 'Acme Corporation', namespace: 'acme', email: 'admin@acme.local', tier: 'standard' },
        { name: 'TestCorp Inc', namespace: 'testcorp', email: 'admin@testcorp.local', tier: 'standard' },
        { name: 'Enterprise One', namespace: 'enterprise1', email: 'admin@enterprise1.local', tier: 'enterprise' },
      ];

      for (const testTenant of testTenants) {
        const existing = await prisma.tenant.findUnique({
          where: { namespace: testTenant.namespace },
        });

        if (existing) {
          logger.log(`  ✓ Test tenant already exists: ${testTenant.name} (namespace: ${testTenant.namespace})`);
        } else {
          const hashedPassword = await bcrypt.hash('testpass123', 10);
          const tenant = await prisma.tenant.create({
            data: {
              name: testTenant.name,
              email: testTenant.email,
              password: hashedPassword,
              namespace: testTenant.namespace,
              tier: testTenant.tier,
            },
          });
          logger.log(`  ✓ Created test tenant: ${tenant.name} (namespace: ${tenant.namespace}, UUID: ${tenant.uuid})`);
        }
      }
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
