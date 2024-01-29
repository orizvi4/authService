import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { CommonModule } from 'src/common/common.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [CommonModule,
    ThrottlerModule.forRoot([{
      ttl: 8000,
      limit: 3,//10
    }])],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard
  }],
})
export class ActiveDirectoryModule { }
