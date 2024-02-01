import { Injectable } from "@nestjs/common";
import { Constants } from "src/common/constants.class";
import { CustomJwtPayload } from "src/common/models/customJwtPayload.class";
import { AuthTokenService } from "src/common/services/AuthToken.service";
import { LoggerService } from "src/common/services/logger.service";
import { StrikeService } from "src/common/services/strike.service";
import { strike } from "src/common/enums/strike.enums";

@Injectable()
export class UserStrikeService {
    constructor(private authTokenService: AuthTokenService, private strikeService: StrikeService) { }

    public async refreshToken(token: string) {
        const decodeToken: CustomJwtPayload = this.authTokenService.decode(token);
        const payload = { username: decodeToken.username, group: decodeToken.group };
        return await this.authTokenService.sign(payload, Constants.ACCESS_TOKEN_EXPIRE);
    }

    public async strike(token: string, strike: strike): Promise<void> {
        try {
            const username: string = this.authTokenService.decode(token).username;
            await this.strikeService.strike(username, strike);
        }
        catch (err) {
            LoggerService.logError("unauthorized token", 'code');
        }
    }

}