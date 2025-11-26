import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  private readonly logger = new Logger(WeatherController.name);

  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  getForecast(
    @Query('q') query?: string,
    @Query('days') days?: string,
    @Query('lang') lang?: string,
  ) {
    this.logger.log(`GET /weather?q=${query}&days=${days}&lang=${lang}`);
    return this.weatherService.getForecast({
      query,
      days: days ? Number(days) : undefined,
      lang,
    });
  }

  @Get(':location')
  getForecastForLocation(@Param('location') location: string) {
    this.logger.log(`GET /weather/${location}`);
    return this.weatherService.getForecast({ query: location });
  }
}
