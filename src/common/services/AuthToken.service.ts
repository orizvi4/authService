import { JwtService } from "@nestjs/jwt";
import { Constants } from "../constants.class";
import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { JwtPayload, jwtDecode } from "jwt-decode";
import { CustomJwtPayload } from "../models/customJwtPayload.class";
import { StrikeService } from "./strike.service";
import { strike } from "../enums/strike.enums";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserStrike } from "../models/userStrike.model";

@Injectable()
export class AuthTokenService {
    constructor(
        private jwtService: JwtService,
        private strikeService: StrikeService,
        @InjectModel(UserStrike.name) private readonly userStrikeModel: Model<UserStrike>
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
            console.log(err.message);
            return { username: null };
        }
    }

    public async setUserRefreshToken(username: string, refreshToken: string = ''): Promise<void> {
        try {
            await this.userStrikeModel.findOneAndUpdate({ username: username }, { $set: { refreshToken: refreshToken } });
        }
        catch (err) {
            console.log(err);
            throw new InternalServerErrorException();
        }
    }

    public async getRefreshToken(token: string): Promise<string> {
        try {
            return (await this.userStrikeModel.findOne({ username: this.decode(token).username })).refreshToken;
        }
        catch (err) {
            console.log(err);
            throw new InternalServerErrorException();
        }
    }

    async verify(token: string, strikeRequest: strike) {
        if (this.blackList.has(token)) {
            const decodedToken: CustomJwtPayload = this.decode(token);
            await this.strikeService.strike(decodedToken.username, strikeRequest);
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
            const decodedToken: CustomJwtPayload = this.decode(token);
            await this.strikeService.strike(decodedToken.username, strikeRequest);
            throw new UnauthorizedException();
        }
    }

    public async addToBlackList(token: string): Promise<void> {
        await this.setUserRefreshToken(this.decode(token).username);
        this.blackList.add(token);
    }
}