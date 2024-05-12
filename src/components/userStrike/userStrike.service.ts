import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Constants } from "src/common/constants.class";
import { CustomJwtPayload } from "src/common/models/customJwtPayload.class";
import { AuthTokenService } from "src/common/services/AuthToken.service";
import { LoggerService } from "src/common/services/logger.service";
import { StrikeService } from "src/common/services/strike.service";
import { strike } from "src/common/enums/strike.enums";
import { StrikeDTO } from "src/common/models/strike.dto";
import { WebsocketService } from "src/common/services/websocket.service";

@Injectable()
export class UserStrikeService {
    constructor(private authTokenService: AuthTokenService,
        private strikeService: StrikeService,
        private websocketService: WebsocketService) { }

    public async refreshToken(token: string) {
        const decodeToken: CustomJwtPayload = this.authTokenService.decode(token);
        const payload = { username: decodeToken.username, group: decodeToken.group };
        return await this.authTokenService.sign(payload, Constants.ACCESS_TOKEN_EXPIRE);
    }

    public async isUserBlocked(username: string): Promise<boolean> {
        return await this.strikeService.isBlocked(username);
    }

    public async setUserBlock(username: string, block: boolean): Promise<void> {
        await this.strikeService.setUserBlock(username, block);
    }

    public async resetPanelty(username: string): Promise<void> {
        await this.strikeService.resetPanelty(username);
    }

    public async kickUser(username: string): Promise<void> {
        await this.websocketService.userSignout(username);
    }

    public async getUserStrikes(username: string): Promise<StrikeDTO[]> {
        return await this.strikeService.getUserStrikes(username);
    }

    public async getUserPanelty(username: string): Promise<number> {
        return await this.strikeService.getUserPanelty(username);
    }

    public async getRefreshToken(token: string): Promise<string> {
        return await this.authTokenService.getRefreshToken(token);
    }

    public async verifyManagerUrl(token: string) {
        if (await this.authTokenService.verify(token, strike.MANAGER_URL) &&
            this.authTokenService.decode(token).group == "managers") {
            return true;
        }
        await this.strike(token, strike.MANAGER_URL);
        throw new UnauthorizedException();
    }

    public async strike(token: string, strike: strike): Promise<void> {
        try {
            const username: string | null = this.authTokenService.decode(token).username;
            await this.strikeService.strike(username, strike);
        }
        catch (err) {
            LoggerService.logError("unauthorized token", 'code');
        }
    }

}