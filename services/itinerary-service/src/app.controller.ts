import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}
  
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
