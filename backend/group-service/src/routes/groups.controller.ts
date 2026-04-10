import { Controller, Get } from '@nestjs/common';

@Controller('groups')
export class GroupsController {
  @Get('health-summary')
  summary() {
    return {
      statusCode: 200,
      intOpCode: 'GRP_SUMMARY_OK',
      message: 'Group endpoints disponibles.',
      data: {
        service: 'group-service',
        framework: 'nest'
      }
    };
  }
}
