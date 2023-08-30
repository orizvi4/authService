import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';

@Module({
  imports: [],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService],
})
export class ActiveDirectoryModule {}
