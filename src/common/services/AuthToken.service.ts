import { JwtService } from "@nestjs/jwt";
import { Constants } from "../constants.class";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtPayload, jwtDecode } from "jwt-decode";
import { CustomJwtPayload } from "../models/customJwtPayload.class";
import { StrikeService } from "./strike.service";
import { strike } from "../strike.enums";

@Injectable()
export class AuthTokenService {
    constructor(
        private jwtService: JwtService,
        private strikeService: StrikeService
    ) { }

    private blackList: Set<string> = new Set();

    async sign(payload, expire: string) {
        return await this.jwtService.signAsync(payload, { secret: Constants.JWT_SECRET, expiresIn: expire })
    }

    decode(token: string): CustomJwtPayload {
        try {
            return jwtDecode(token);
        }
        catch (err) {
            return undefined;
        }
    }

    async verify(token: string, strikeRequest: strike) {
        if (this.blackList.has(token)) {
            const decodedToken :CustomJwtPayload = this.decode(token);
            this.strikeService.strike(decodedToken.username, strikeRequest);
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
            const decodedToken :CustomJwtPayload = this.decode(token);
            this.strikeService.strike(decodedToken.username, strikeRequest);
            throw new UnauthorizedException();
        }
    }

    addToBlackList(token: string): void {
        this.blackList.add(token);
    }
}