/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

type ForecastRequestOptions = {
  query?: string;
  days?: number;
  lang?: string;
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly baseUrl = 'https://api.weatherapi.com/v1/forecast.json';
  private readonly apiKey = process.env.WEATHER_API_KEY;

  constructor(private readonly httpService: HttpService) {
    if (!this.apiKey) {
      this.logger.error('WEATHER_API_KEY is not set - weather service will not work');
    }
  }

  async getForecast({ query, days = 3, lang = 'DE' }: ForecastRequestOptions) {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      throw new BadRequestException('Parameter "q" (location) is required.');
    }

    const sanitizedDays = this.normalizeDays(days);
    const sanitizedLang = lang.trim() || 'DE';

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          headers: { accept: 'application/json' },
          params: {
            q: trimmedQuery,
            days: sanitizedDays,
            lang: sanitizedLang,
            key: this.apiKey,
          },
        }),
      );

      const current = response.data.current ?? {};
      const forecastDays =
        response.data.forecast?.forecastday?.map((day: any) => ({
          date: day.date,
          maxtemp_c: day.day?.maxtemp_c,
          mintemp_c: day.day?.mintemp_c,
          avgtemp_c: day.day?.avgtemp_c,
          condition: day.day?.condition,
          daily_chance_of_rain: day.day?.daily_chance_of_rain,
        })) ?? [];

      return {
        current: {
          temp_c: current.temp_c,
          condition: current.condition,
          wind_kph: current.wind_kph,
          feelslike_c: current.feelslike_c,
        },
        forecast: forecastDays,
      };
    } catch (error) {
      this.handleHttpError(error, trimmedQuery);
    }
  }

  private normalizeDays(value?: number) {
    if (!value || Number.isNaN(value)) {
      return 3;
    }
    return Math.max(1, Math.min(10, Math.trunc(value)));
  }

  private handleHttpError(error: unknown, query: string): never {
    if (error instanceof AxiosError) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const remoteMessage =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (error.response?.data as { error?: { message?: string } })?.error
          ?.message ?? error.message;

      this.logger.error(
        `Weather API request failed for "${query}": ${remoteMessage}`,
        error.stack,
      );

      throw new ServiceUnavailableException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.status === 400
          ? `Weather API rejected the request for "${query}": ${remoteMessage}`
          : 'Weather data is temporarily unavailable.',
      );
    }

    this.logger.error(
      `Unexpected error while fetching weather for "${query}"`,
      String(error),
    );
    throw new ServiceUnavailableException(
      'Weather data is temporarily unavailable.',
    );
  }
}
