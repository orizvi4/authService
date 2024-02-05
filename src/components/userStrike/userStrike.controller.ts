import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ActiveDirectoryService } from "../activeDirectory/activeDirectory.service";
import { UserStrikeService } from "./userStrike.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { EditorGuard } from "src/common/guards/editor.guard";
import { ManagerGuard } from "src/common/guards/manager.guard";
import { strike } from "src/common/enums/strike.enums";
import { UserStrikeDTO } from "../../common/models/userStrike.dto";
import { SkipThrottle } from "@nestjs/throttler";
import { StrikeDTO } from "src/common/models/strike.dto";

@Controller()
export class UserStrikeController {
  constructor(private readonly userStrikeService: UserStrikeService) { }

  @SkipThrottle()
  @Post("/strike/localStorage")
  public localStorageStrike(@Body() body) {
    this.userStrikeService.strike(body.token, strike.LOCAL_STORAGE);
  }

  @SkipThrottle()
  @Post("/strike/dos")
  public dosStrike(@Body() body) {
    this.userStrikeService.strike(body.token, strike.DOS);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard)
  @Post('/tokens/refresh')
  public async refreshToken(@Body() body): Promise<string> {
    return await this.userStrikeService.refreshToken(body.token);
  }

  @SkipThrottle()
  @UseGuards(ManagerGuard)
  @Get('/users/isBlocked')
  public async isUserBlocked(@Query('username') username: string): Promise<boolean> {
    return await this.userStrikeService.isUserBlocked(username);
  }


  @UseGuards(ManagerGuard)
  @Post('/users/block')
  public async setUserBlock(@Body('username') username: string, @Body('block') block: boolean): Promise<void> {
    await this.userStrikeService.setUserBlock(username, block);
  }

  @UseGuards(ManagerGuard)
  @Get('/users/strikes')
  public async getUserStrikes(@Query('username') username: string): Promise<StrikeDTO[]> {
    return await this.userStrikeService.getUserStrikes(username);
  }

  @UseGuards(ManagerGuard)
  @Get('/users/panelty')
  public async getUserPanelty(@Query('username') username: string): Promise<number> {
    return await this.userStrikeService.getUserPanelty(username);
  }

  @UseGuards(ManagerGuard)
  @Put('/users/resetPanelty')
  public async resetPanelty(@Body('username') username: string): Promise<void> {
    return await this.userStrikeService.resetPanelty(username);
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