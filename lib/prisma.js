import { PrismaClient } from "@prisma/client";

// Cloud Run optimized Prisma configuration with connection pooling
const prismaClientSingleton = () => {
  // Connection pooling is configured via DATABASE_URL parameters:
  // - connection_limit: max connections per instance
  // - pool_timeout: connection timeout in seconds
  // - pgbouncer: enables pgbouncer mode (transaction pooling)
  
  // Only initialize if DATABASE_URL is available and not a dummy value
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('dummy')) {
    console.warn('⚠️  DATABASE_URL not available - skipping Prisma initialization');
    return null;
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

// Ensure single instance across hot reloads
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Only cache in globalThis if prisma is actually initialized
if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown for Cloud Run
if (process.env.NODE_ENV === "production" && prisma) {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, disconnecting Prisma...');
    await prisma.$disconnect();
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, disconnecting Prisma...');
    await prisma.$disconnect();
  });
}
