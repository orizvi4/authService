import { Module } from "@nestjs/common";
import { UserStrikeController } from "./userStrike.controller";
import { UserStrikeService } from "./userStrike.service";
import { MongooseModule } from "@nestjs/mongoose";
import { UserStrike, UserStrikeSchema } from "src/components/userStrike/models/userStrike.model";
import { AuthTokenService } from "src/common/services/AuthToken.service";
import { CommonModule } from "src/common/common.module";

@Module({
    imports: [MongooseModule.forFeature([{ name: UserStrike.name, schema: UserStrikeSchema }]), CommonModule],
    controllers: [UserStrikeController],
    providers: [UserStrikeService],
  })
  export class UserStrikeModule {}
  