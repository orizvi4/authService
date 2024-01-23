import { Module } from '@nestjs/common';
import { ActiveDirectoryController } from './activeDirectory.controller';
import { ActiveDirectoryService } from './activeDirectory.service';
import { LoggerService } from 'src/common/services/logger.service';
import { JwtModule } from '@nestjs/jwt';
import { Constants } from 'src/common/constants.class';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { AuthTokenService } from 'src/common/services/AuthToken.service';
import { EditorGuard } from 'src/common/guards/editor.guard';
import { ManagerGuard } from 'src/common/guards/manager.guard';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [JwtModule.register({}), CommonModule],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService],
})
export class ActiveDirectoryModule {}
