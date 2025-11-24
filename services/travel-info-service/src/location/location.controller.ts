import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('coordinates')
  async getCoordinates(@Query('name') name: string) {
    if (!name) {
      throw new BadRequestException('Query parameter "name" is required');
    }

    return await this.locationService.getCoordinatesByLocationName(name);
  }

  @Get('city')
  async getCityName(@Query('lat') lat: string, @Query('lon') lon: string) {
    if (!lat || !lon) {
      throw new BadRequestException(
        'Query parameters "lat" and "lon" are required',
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Invalid latitude or longitude');
    }

    return await this.locationService.getCityNameByCoordinates(
      latitude,
      longitude,
    );
  }
}
