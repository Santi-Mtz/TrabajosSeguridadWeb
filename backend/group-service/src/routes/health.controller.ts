import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      statusCode: 200,
      intOpCode: 'GRP_HEALTH_OK',
      message: 'Group service healthy',
      data: null
    };
  }
}
