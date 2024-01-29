import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { Request, Response } from 'express';
import { AuthTokenService } from "../services/AuthToken.service";
import { StrikeService } from "../services/strike.service";
import { strike } from "../strike.enums";

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
    constructor(private authTokenService: AuthTokenService, private strikeService: StrikeService) {}
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        const username: string = this.authTokenService.decode(request.headers.authorization.split(' ')[1]).username;
        this.strikeService.strike(username, strike.DOS);

        response.status(status).json({
            statusCode: status,
          });
    }

}