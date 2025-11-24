import { HttpService } from '@nestjs/axios';
import { Injectable, BadRequestException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LocationService {
  constructor(private readonly httpService: HttpService) {}

  async getCoordinatesByLocationName(
    locationName: string,
  ): Promise<{ lat: string; lon: string } | null> {
    if (!locationName) {
      throw new BadRequestException('Location name is required');
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      locationName,
    )}&format=jsonv2`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data as Array<{ lat: string; lon: string }>;

      if (Array.isArray(data) && data.length === 1) {
        const { lat, lon } = data[0];
        return { lat, lon };
      }

      return null;
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      throw new BadRequestException('Failed to fetch coordinates');
    }
  }
}
