import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActiveDirectoryModule } from './components/activeDirectory/activeDirectory.module';

@Module({
  imports: [ActiveDirectoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
