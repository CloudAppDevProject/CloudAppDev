import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';

@Injectable()
export class ItinerariesService {
  private readonly logger = new Logger(ItinerariesService.name);

  constructor(private prisma: PrismaService) {}

  async create(createItineraryDto: CreateItineraryDto) {
    const { userId, locations, ...itineraryData } = createItineraryDto;

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

  async findAll(options?: {
    userId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, search, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    this.logger.log(
      `Finding itineraries - userId: ${userId}, search: ${search}, page: ${page}, limit: ${limit}`
    );

    // Build where clause
    const where: any = {};
    if (userId) {
      where.user_id = userId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { short_desc: { contains: search, mode: 'insensitive' } },
        { detail_desc: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      // Execute queries in parallel
      const [itineraries, totalCount] = await Promise.all([
        this.prisma.itinerary.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { id: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.itinerary.count({
          where: Object.keys(where).length > 0 ? where : undefined,
        }),
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
      this.logger.error(`Error finding itineraries: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number, includeLocations = true) {
    this.logger.log(`Finding itinerary with ID: ${id}`);
    try {
      const itinerary = await this.prisma.itinerary.findUnique({
        where: { id },
        include: { locations: includeLocations },
      });
      if (itinerary) {
        this.logger.debug(`Itinerary found with ID: ${id}`);
      } else {
        this.logger.warn(`Itinerary not found with ID: ${id}`);
      }
      return itinerary;
    } catch (error) {
      this.logger.error(`Error finding itinerary with ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateItineraryDto: UpdateItineraryDto) {
    const { userId, locations, ...updateData } = updateItineraryDto;

    this.logger.log(`Updating itinerary with ID: ${id}, ${locations ? 'with' : 'without'} locations`);

    try {
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

  async remove(id: number) {
    this.logger.log(`Deleting itinerary with ID: ${id}`);
    try {
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
