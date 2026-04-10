import { Module } from '@nestjs/common';
import { HealthController } from '../routes/health.controller';
import { GroupsController } from '../routes/groups.controller';
import { DatabaseService } from '../services/database.service';
import { GroupService } from '../services/group.service';

@Module({
  controllers: [HealthController, GroupsController],
  providers: [DatabaseService, GroupService],
})
export class AppModule {}
