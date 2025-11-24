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
}
