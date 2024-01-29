import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { CommonModule } from 'src/common/common.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerExceptionFilter } from 'src/common/filters/throttlerException.filter';

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
  }, {
    provide: APP_FILTER,
    useClass: ThrottlerExceptionFilter,
  },],
})
export class ActiveDirectoryModule { }
