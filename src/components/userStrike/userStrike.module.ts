import { Module } from "@nestjs/common";
import { UserStrikeController } from "./userStrike.controller";
import { UserStrikeService } from "./userStrike.service";
import { CommonModule } from "src/common/common.module";

@Module({
    imports: [CommonModule],
    controllers: [UserStrikeController],
    providers: [UserStrikeService],
  })
  export class UserStrikeModule {}
  