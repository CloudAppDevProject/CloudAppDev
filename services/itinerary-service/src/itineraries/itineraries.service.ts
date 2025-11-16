import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';

@Injectable()
export class ItinerariesService {
  constructor(private prisma: PrismaService) {}

  async create(createItineraryDto: CreateItineraryDto) {
    const { userId, locations, ...itineraryData } = createItineraryDto;

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
      return await Promise.race([createPromise, timeoutPromise]);
    } catch (error) {
      if (error.message.includes('timeout')) {
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

    return {
      data: itineraries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOne(id: number, includeLocations = true) {
    return this.prisma.itinerary.findUnique({
      where: { id },
      include: { locations: includeLocations },
    });
  }

  async update(id: number, updateItineraryDto: UpdateItineraryDto) {
    const { userId, locations, ...updateData } = updateItineraryDto;

    // If locations are provided, replace all locations
    if (locations) {
      return this.prisma.itinerary.update({
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
    }

    // Otherwise just update itinerary fields
    return this.prisma.itinerary.update({
      where: { id },
      data: { ...updateData, user_id: userId },
      include: { locations: true },
    });
  }

  async remove(id: number) {
    // Cascade delete will automatically remove locations
    return this.prisma.itinerary.delete({
      where: { id },
    });
  }
}
