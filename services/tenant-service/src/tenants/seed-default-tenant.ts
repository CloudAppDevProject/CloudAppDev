import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

    // defaults
    const tenantEmail = process.env.FREE_TENANT_EMAIL || 'free@example.local';
    const tenantPassword = process.env.FREE_TENANT_PASSWORD || 'changeme';
    const tenantNamespace = process.env.FREE_TENANT_NAMESPACE || 'free-community';

    // Hash the password
    const hashedPassword = await bcrypt.hash(tenantPassword, 10);

    // Create default tenant (UUID will be generated automatically)
    const defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Free Community',
        email: tenantEmail,
        password: hashedPassword,
        namespace: tenantNamespace,
        tier: 'free',
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
