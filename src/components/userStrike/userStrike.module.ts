import { Module } from "@nestjs/common";
import { UserStrikeController } from "./userStrike.controller";
import { UserStrikeService } from "./userStrike.service";
import { MongooseModule } from "@nestjs/mongoose";
import { UserStrike, UserStrikeSchema } from "src/common/models/userStrike.model";
import { AuthTokenService } from "src/common/services/AuthToken.service";
import { CommonModule } from "src/common/common.module";

@Module({
    imports: [CommonModule],
    controllers: [UserStrikeController],
    providers: [UserStrikeService],
  })
  export class UserStrikeModule {}
  