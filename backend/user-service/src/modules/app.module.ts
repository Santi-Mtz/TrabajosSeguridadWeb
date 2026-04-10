import { Module } from '@nestjs/common';
import { AuthController } from '../routes/auth.controller';
import { AuthService } from '../services/auth.service';
import { DatabaseService } from '../services/database.service';
import { HealthController } from '../routes/health.controller';

@Module({
  controllers: [HealthController, AuthController],
  providers: [DatabaseService, AuthService]
})
export class AppModule {}
