import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from 'express';
import { AuthTokenService } from "../services/AuthToken.service";
import { StrikeService } from "../services/strike.service";
import { strike } from "../enums/strike.enums";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private authTokenService: AuthTokenService, private strikeService: StrikeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token: string = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    request.headers["username"] = this.authTokenService.decode(token).username;
    return await this.authTokenService.verify(token, strike.REQUEST);
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}