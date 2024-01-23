import { Module } from "@nestjs/common";
import { ActiveDirectoryService } from "src/components/activeDirectory/activeDirectory.service";
import { AuthTokenService } from "./services/AuthToken.service";
import { LoggerService } from "./services/logger.service";
import { StrikeService } from "./services/strike.service";
import { JwtModule } from "@nestjs/jwt";

@Module({
    imports: [JwtModule],
    providers: [StrikeService, LoggerService, AuthTokenService],
    exports: [StrikeService, LoggerService, AuthTokenService]
  })
  export class CommonModule {}