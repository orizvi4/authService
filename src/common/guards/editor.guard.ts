import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Constants } from "../constants.class";
import { Request } from 'express';
import { AuthTokenService } from "../services/AuthToken.service";
import { strike } from "../enums/strike.enums";

@Injectable()
export class EditorGuard implements CanActivate {
    constructor(private authTokenService: AuthTokenService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token: string = this.extractTokenFromHeader(request);
        if (token) {
            request.headers["username"] = this.authTokenService.decode(token).username;
            if (await this.authTokenService.verify(token, strike.EDITOR_REQUEST) &&
                (JSON.parse(this.decode(token)).group == "editors" || JSON.parse(this.decode(token)).group == "managers")) {
                return true;
            }
        }
        throw new UnauthorizedException();
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

    private decode(token: string): string {
        return decodeURIComponent(atob(token.split('.')[1].replace('-', '+').replace('_', '/')).split('')
            .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
    }
}