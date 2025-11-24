import { Module } from '@nestjs/common';
import { WeatherModule } from './weather/weather.module';
import { LocationModule } from './location/location.module';

@Module({
  imports: [WeatherModule, LocationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
