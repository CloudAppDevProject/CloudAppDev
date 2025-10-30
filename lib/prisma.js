import { PrismaClient } from "@prisma/client";

// Cloud Run optimized Prisma configuration with connection pooling
const prismaClientSingleton = () => {
  // Connection pooling is configured via DATABASE_URL parameters:
  // - connection_limit: max connections per instance
  // - pool_timeout: connection timeout in seconds
  // - pgbouncer: enables pgbouncer mode (transaction pooling)
  
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Ensure single instance across hot reloads
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown for Cloud Run
if (process.env.NODE_ENV === "production") {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, disconnecting Prisma...');
    await prisma.$disconnect();
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, disconnecting Prisma...');
    await prisma.$disconnect();
  });
}
