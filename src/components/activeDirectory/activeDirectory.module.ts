import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { LoggerService } from 'src/common/services/logger.service';

@Module({
  imports: [],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService, LoggerService],
})
export class ActiveDirectoryModule {}
