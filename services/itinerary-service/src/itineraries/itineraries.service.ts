import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantUsersService } from '../tenant-users/tenant-users.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';

@Injectable()
export class ItinerariesService implements OnModuleInit {
  private readonly logger = new Logger(ItinerariesService.name);

  constructor(
    private prisma: PrismaService,
    private tenantUsersService: TenantUsersService,
  ) {}

  async onModuleInit() {
    try {
      // Check for legacy tenantId column that should have been removed by migration
      const cols: Array<{ column_name: string }> = await this.prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns WHERE table_name='Itinerary'
      `;
      const colNames = cols.map(c => c.column_name);
      if (colNames.includes('tenantId')) {
        this.logger.error('Startup schema check: found legacy column `tenantId` on Itinerary table.');
        this.logger.error('Please run migrations and regenerate Prisma client: `npx prisma migrate deploy && npx prisma generate`, then rebuild the service image.');
      } else {
        this.logger.log('Startup schema check: Itinerary table is up-to-date (no tenantId column detected).');
      }
    } catch (err) {
      this.logger.warn(`Startup schema check failed: ${(err as Error).message}`);
    }
  }

  async create(userId: number, createItineraryDto: CreateItineraryDto) {
    const { userId: dtoUserId, locations, ...itineraryData } = createItineraryDto;

    this.logger.log(
      `Creating itinerary for user ${userId} with ${locations?.length || 0} locations`
    );

    // Create itinerary with locations using Prisma transaction
    const createPromise = this.prisma.itinerary.create({
      data: {
        user_id: userId,
        ...itineraryData,
        locations: locations && Array.isArray(locations)
          ? {
              create: locations.map(loc => ({
                name: loc.name,
                start_date: loc.start_date,
                end_date: loc.end_date,
                short_desc: loc.short_desc,
                images: loc.images || [],
                latitude: loc.latitude,
                longitude: loc.longitude,
              }))
            }
          : undefined,
      },
      include: { locations: true },
    });

    // Timeout after 15 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timeout after 15s')), 15000)
    );

    try {
      const result = await Promise.race([createPromise, timeoutPromise]);
      this.logger.debug(`Itinerary created successfully with ID: ${(result as any).id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating itinerary for user ${userId}: ${(error as any).message}`, (error as any).stack);
      if ((error as any).message.includes('timeout')) {
        throw new Error('Service temporarily unavailable, please try again');
      }
      throw error;
    }
  }

  async findAll(tenantUuid: string, options?: {
    userId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, search, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    this.logger.log(
      `Finding itineraries for tenant ${tenantUuid} - userId: ${userId}, search: ${search}, page: ${page}, limit: ${limit}`
    );

    // Get all user IDs belonging to the same tenant
    const tenantUserIds = await this.tenantUsersService.getUserIdsByTenant(tenantUuid);

    if (tenantUserIds.length === 0) {
      this.logger.warn(`No users found for tenant ${tenantUuid}, returning empty result`);
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    // Build where clause - filter by users in the same tenant
    const where: any = { user_id: { in: tenantUserIds } };
    if (userId) {
      // If specific userId requested, verify they belong to the tenant
      if (!tenantUserIds.includes(userId)) {
        this.logger.warn(`User ${userId} does not belong to tenant ${tenantUuid}`);
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      where.user_id = userId;
    }
    if (search) {
      where.AND = [
        { user_id: userId ? userId : { in: tenantUserIds } },
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { destination: { contains: search, mode: 'insensitive' } },
            { short_desc: { contains: search, mode: 'insensitive' } },
            { detail_desc: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.user_id;
    }

    try {
      // Execute queries in parallel
      const [itineraries, totalCount] = await Promise.all([
        this.prisma.itinerary.findMany({
          where,
          orderBy: { id: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.itinerary.count({ where }),
      ]);

      this.logger.debug(`Found ${itineraries.length} itineraries out of ${totalCount} total`);
      return {
        data: itineraries,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      // Improve diagnostics for schema mismatches (e.g., stale Prisma client / missing column)
      if (error && error.code === 'P2022' && error.meta && error.meta.column) {
        const col = error.meta.column;
        this.logger.error(`Schema mismatch detected: missing column ${col}.`);
        this.logger.error('Possible causes: migrations not deployed, or Prisma client is stale. Run `npx prisma migrate deploy` and rebuild images.');
        // Re-throw with clearer message for operators
        throw new Error(`Database schema mismatch: missing column ${col}. Ensure migrations have been applied and Prisma client regenerated.`);
      }

      this.logger.error(`Error finding itineraries: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number, tenantUuid: string, includeLocations = true) {
    this.logger.log(`Finding itinerary with ID: ${id} for tenant ${tenantUuid}`);
    try {
      // Get user IDs for the tenant to verify ownership
      const tenantUserIds = await this.tenantUsersService.getUserIdsByTenant(tenantUuid);

      // Find itinerary and verify it belongs to a user in the tenant
      const itinerary = await this.prisma.itinerary.findFirst({
        where: { id, user_id: { in: tenantUserIds } },
        include: { locations: includeLocations },
      });

      if (!itinerary) {
        this.logger.warn(`Itinerary not found with ID: ${id} for tenant ${tenantUuid}`);
        throw new NotFoundException('Itinerary not found');
      }

      this.logger.debug(`Itinerary found with ID: ${id}`);
      return itinerary;
    } catch (error) {
      this.logger.error(`Error finding itinerary with ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, tenantUuid: string, updateItineraryDto: UpdateItineraryDto) {
    const { userId, locations, ...updateData } = updateItineraryDto;

    this.logger.log(`Updating itinerary with ID: ${id} for tenant ${tenantUuid}, ${locations ? 'with' : 'without'} locations`);

    try {
      // Get user IDs for the tenant to verify ownership
      const tenantUserIds = await this.tenantUsersService.getUserIdsByTenant(tenantUuid);

      // Verify itinerary belongs to a user in the tenant
      const existing = await this.prisma.itinerary.findFirst({
        where: { id, user_id: { in: tenantUserIds } },
      });

      if (!existing) {
        this.logger.warn(`Itinerary not found with ID: ${id} for tenant ${tenantUuid}`);
        throw new NotFoundException('Itinerary not found');
      }

      // If locations are provided, replace all locations
      if (locations) {
        const result = await this.prisma.itinerary.update({
          where: { id },
          data: {
            ...updateData,
            user_id: userId,
            locations: {
              deleteMany: {}, // Delete all existing locations
              create: locations.map(loc => ({
                name: loc.name,
                start_date: loc.start_date,
                end_date: loc.end_date,
                short_desc: loc.short_desc,
                images: loc.images || [],
                latitude: loc.latitude,
                longitude: loc.longitude,
              })),
            },
          },
          include: { locations: true },
        });
        this.logger.debug(`Itinerary updated successfully with ID: ${id}, locations replaced: ${locations.length}`);
        return result;
      }

      // Otherwise just update itinerary fields
      const result = await this.prisma.itinerary.update({
        where: { id },
        data: { ...updateData, user_id: userId },
        include: { locations: true },
      });
      this.logger.debug(`Itinerary updated successfully with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating itinerary with ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number, tenantUuid: string) {
    this.logger.log(`Deleting itinerary with ID: ${id} for tenant ${tenantUuid}`);
    try {
      // Get user IDs for the tenant to verify ownership
      const tenantUserIds = await this.tenantUsersService.getUserIdsByTenant(tenantUuid);

      // Verify itinerary belongs to a user in the tenant
      const existing = await this.prisma.itinerary.findFirst({
        where: { id, user_id: { in: tenantUserIds } },
      });

      if (!existing) {
        this.logger.warn(`Itinerary not found with ID: ${id} for tenant ${tenantUuid}`);
        throw new NotFoundException('Itinerary not found');
      }

      // Cascade delete will automatically remove locations
      await this.prisma.itinerary.delete({
        where: { id },
      });
      this.logger.debug(`Itinerary deleted successfully with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting itinerary with ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
