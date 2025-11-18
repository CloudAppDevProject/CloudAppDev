import { Controller, Get, Param, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  getForecast(
    @Query('q') query?: string,
    @Query('days') days?: string,
    @Query('lang') lang?: string,
  ) {
    return this.weatherService.getForecast({
      query,
      days: days ? Number(days) : undefined,
      lang,
    });
  }

  @Get(':location')
  getForecastForLocation(@Param('location') location: string) {
    return this.weatherService.getForecast({ query: location });
  }
}
