import { JwtService } from "@nestjs/jwt";
import { Constants } from "../constants.class";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AuthTokenService {
    constructor(private jwtService: JwtService) { }

    private blackList: Set<string> = new Set();

    async sign(payload, expire: string) {
        return await this.jwtService.signAsync(payload, { secret: Constants.JWT_SECRET, expiresIn: expire })
    }

    async verify(token: string) {
        if (this.blackList.has(token)) {
            throw new UnauthorizedException();
        }

        try {
            await this.jwtService.verifyAsync(
                token,
                {
                    secret: Constants.JWT_SECRET
                }
            );
        } catch {
            throw new UnauthorizedException();
        }
        return true;
    }

    addToBlackList(token: string): void {
        this.blackList.add(token);
    }
}