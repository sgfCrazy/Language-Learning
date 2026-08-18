import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health(): { status: string; service: string; time: string } {
    return {
      status: 'ok',
      service: 'language-learning-server',
      time: new Date().toISOString(),
    };
  }
}
