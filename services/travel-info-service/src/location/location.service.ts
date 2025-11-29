import { HttpService } from '@nestjs/axios';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly httpService: HttpService) {}

  async getCoordinatesByLocationName(
    locationName: string,
  ): Promise<{ lat: string; lon: string } | null> {
    console.log(`Getting coordinates for location: ${locationName}`);
    if (!locationName) {
      console.log('Location name is required but not provided');
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
        console.log(
          `Found coordinates for ${locationName}: lat=${lat}, lon=${lon}`,
        );
        return { lat, lon };
      }

      console.log(`No coordinates found for location: ${locationName}`);
      return null;
    } catch (error) {
      console.log(
        `Error fetching coordinates for ${locationName}: ${(error as any).message}`,
        (error as any).stack,
      );
      throw new BadRequestException('Failed to fetch coordinates');
    }
  }

  async getCityNameByCoordinates(
    lat: number,
    lon: number,
  ): Promise<{ name: string } | null> {
    console.log(`Getting city name for coordinates: lat=${lat}, lon=${lon}`);
    if (!lat || !lon) {
      console.log('Latitude and longitude are required but not provided');
      throw new BadRequestException('Latitude and longitude are required');
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
        };
        display_name?: string;
      };

      const cityName =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality ||
        data.display_name;

      if (cityName) {
        console.log(
          `Found city name for coordinates (${lat}, ${lon}): ${cityName}`,
        );
        return { name: cityName };
      }

      console.log(`No city name found for coordinates: lat=${lat}, lon=${lon}`);
      return null;
    } catch (error) {
      console.log(
        `Error fetching city name for coordinates (${lat}, ${lon}): ${(error as any).message}`,
        (error as any).stack,
      );
      throw new BadRequestException('Failed to fetch city name');
    }
  }
}
