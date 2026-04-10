import { Module } from '@nestjs/common';
import { AuthController } from '../routes/auth.controller';
import { UsersController } from '../routes/users.controller';
import { AuthService } from '../services/auth.service';
import { DatabaseService } from '../services/database.service';
import { HealthController } from '../routes/health.controller';
import { UsersService } from '../services/users.service';

@Module({
  controllers: [HealthController, AuthController, UsersController],
  providers: [DatabaseService, AuthService, UsersService]
})
export class AppModule {}
