import { Module, forwardRef } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { CommonModule } from 'src/common/common.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerExceptionFilter } from 'src/common/filters/throttlerException.filter';

@Module({
  imports: [forwardRef(() => CommonModule),
    ThrottlerModule.forRoot([{
      ttl: 1000,
      limit: 12,
    }])],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard
  }, {
    provide: APP_FILTER,
    useClass: ThrottlerExceptionFilter,
  },],
  exports: [ActiveDirectoryService]
})
export class ActiveDirectoryModule { }
