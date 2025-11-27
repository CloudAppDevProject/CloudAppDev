import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint for Kubernetes/service discovery
   * Used by load balancers and async job schedulers
   */
  @Get('health')
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'itinerary-service',
      timestamp: new Date().toISOString(),
    };
  }
}
