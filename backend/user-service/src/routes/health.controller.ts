import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      statusCode: 200,
      intOpCode: 'USR_HEALTH_OK',
      message: 'User service healthy',
      data: null
    };
  }
}
