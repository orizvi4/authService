import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActiveDirectoryModule } from './components/activeDirectory/activeDirectory.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserStrikeModule } from './components/userStrike/userStrike.module';

@Module({
  imports: [ActiveDirectoryModule, UserStrikeModule, MongooseModule.forRoot('mongodb://192.168.1.5:27017/database')],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
