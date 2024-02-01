import { Module, forwardRef } from "@nestjs/common";
import { ActiveDirectoryService } from "src/components/activeDirectory/activeDirectory.service";
import { AuthTokenService } from "./services/AuthToken.service";
import { LoggerService } from "./services/logger.service";
import { StrikeService } from "./services/strike.service";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { UserStrike, UserStrikeSchema } from "src/common/models/userStrike.model";
import { ActiveDirectoryModule } from "src/components/activeDirectory/activeDirectory.module";

@Module({
    imports: [JwtModule, MongooseModule.forFeature([{ name: UserStrike.name, schema: UserStrikeSchema }]), forwardRef(() => ActiveDirectoryModule)],
    providers: [StrikeService, LoggerService, AuthTokenService],
    exports: [StrikeService, LoggerService, AuthTokenService]
  })
  export class CommonModule {}