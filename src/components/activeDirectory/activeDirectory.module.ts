import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { LoggerService } from 'src/common/services/logger.service';
import { JwtModule } from '@nestjs/jwt';
import { Constants } from 'src/common/constants.class';

@Module({
  imports: [JwtModule.register({
    global: true,
    secret: Constants.JWT_SECRET,
    signOptions: { expiresIn: '60s' },
  })],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService, LoggerService],
})
export class ActiveDirectoryModule {}
