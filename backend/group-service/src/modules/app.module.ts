import { Module } from '@nestjs/common';
import { HealthController } from '../routes/health.controller';
import { GroupsController } from '../routes/groups.controller';

@Module({
  controllers: [HealthController, GroupsController]
})
export class AppModule {}
