import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { LoggerService } from 'src/common/services/logger.service';
import { JwtModule } from '@nestjs/jwt';
import { Constants } from 'src/common/constants.class';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { AuthTokenService } from 'src/common/services/AuthToken.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService, LoggerService, AuthGuard, AuthTokenService],
})
export class ActiveDirectoryModule {}
