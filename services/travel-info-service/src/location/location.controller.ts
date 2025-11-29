import { Controller, Get, Query, BadRequestException, Logger } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('location')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(private readonly locationService: LocationService) {}

  @Get('coordinates')
  async getCoordinates(@Query('name') name: string) {
    this.logger.log(`GET /location/coordinates?name=${name}`);
    if (!name) {
      this.logger.warn('Missing required query parameter: name');
      throw new BadRequestException('Query parameter "name" is required');
    }

    this.logger.debug(`Fetching coordinates for location: "${name}"`);
    const result =
      await this.locationService.getCoordinatesByLocationName(name);
    if (result) {
      this.logger.log(
        `Successfully retrieved coordinates for "${name}": lat=${result.lat}, lon=${result.lon}`,
      );
    }
    return result;
  }

  @Get('city')
  async getCityName(@Query('lat') lat: string, @Query('lon') lon: string) {
    this.logger.log(`GET /location/city?lat=${lat}&lon=${lon}`);
    if (!lat || !lon) {
      this.logger.warn('Missing required query parameters: lat and/or lon');
      throw new BadRequestException(
        'Query parameters "lat" and "lon" are required',
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      this.logger.warn(`Invalid coordinates: lat=${lat}, lon=${lon}`);
      throw new BadRequestException('Invalid latitude or longitude');
    }

    this.logger.debug(
      `Reverse geocoding coordinates: latitude=${latitude}, longitude=${longitude}`,
    );
    const result = await this.locationService.getCityNameByCoordinates(
      latitude,
      longitude,
    );
    if (result) {
      this.logger.log(
        `Successfully resolved city name for coordinates (${latitude}, ${longitude}): "${result.name}"`,
      );
    }
    return result;
  }
}
