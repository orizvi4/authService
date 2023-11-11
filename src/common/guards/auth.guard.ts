import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Constants } from "../constants.class";
import { Request } from 'express';
import { AuthTokenService } from "../services/AuthToken.service";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private authTokenService: AuthTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      
      throw new UnauthorizedException();
    }
    return await this.authTokenService.verify(token);
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}