import { JwtService } from "@nestjs/jwt";
import { Constants } from "../constants.class";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtPayload, jwtDecode } from "jwt-decode";

@Injectable()
export class AuthTokenService {
    constructor(private jwtService: JwtService) { }

    private blackList: Set<string> = new Set();

    async sign(payload, expire: string) {
        return await this.jwtService.signAsync(payload, { secret: Constants.JWT_SECRET, expiresIn: expire })
    }

    decode(token: string): JwtPayload {
        return jwtDecode<JwtPayload>(token);
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
            return true;
        } catch {
            throw new UnauthorizedException();
        }
    }

    addToBlackList(token: string): void {
        this.blackList.add(token);
    }
}