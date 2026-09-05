import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): HealthStatus {
    return this.health.live();
  }

  @Get('ready')
  ready(): Promise<HealthStatus> {
    return this.health.ready();
  }
}
