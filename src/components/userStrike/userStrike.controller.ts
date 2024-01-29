import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ActiveDirectoryService } from "../activeDirectory/activeDirectory.service";
import { UserStrikeService } from "./userStrike.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { EditorGuard } from "src/common/guards/editor.guard";
import { ManagerGuard } from "src/common/guards/manager.guard";
import { strike } from "src/common/strike.enums";
import { UserStrikeDTO } from "./models/userStrike.dto";
import { SkipThrottle } from "@nestjs/throttler";

@Controller()
export class UserStrikeController {
  constructor(private readonly userStrikeService: UserStrikeService) { }

  @SkipThrottle()
  @Post("/strike/localStorage")
  public localStorageStrike(@Body() body: UserStrikeDTO) {
    this.userStrikeService.strike(body.username, strike.LOCAL_STORAGE);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard)
  @Post('/tokens/refresh')
  public async refreshToken(@Body() body): Promise<string> {
    return await this.userStrikeService.refreshToken(body.token);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard)
  @Get('/tokens/verify')
  public tokenVerify(): boolean {
    return true;
  }

  @SkipThrottle()
  @UseGuards(ManagerGuard)
  @Get('/tokens/verify/manager')
  public managerVerify(): boolean {
    return true;
  }

  @SkipThrottle()
  @UseGuards(EditorGuard)
  @Get('/tokens/verify/editor')
  public editorVerify(): boolean {
    return true;
  }
}