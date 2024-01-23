import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ActiveDirectoryService } from "../activeDirectory/activeDirectory.service";
import { UserStrikeService } from "./userStrike.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { EditorGuard } from "src/common/guards/editor.guard";
import { ManagerGuard } from "src/common/guards/manager.guard";
import { strike } from "src/common/strike.enums";
import { UserStrikeDTO } from "./models/userStrike.dto";

@Controller()
export class UserStrikeController {
  constructor(private readonly userStrikeService: UserStrikeService) { }

  @Post("/strike/localStorage")
  public localStorageStrike(@Body() body: UserStrikeDTO) {
    this.userStrikeService.strike(body.userName, strike.LOCAL_STORAGE);
  }

  @UseGuards(AuthGuard)
  @Post('/tokens/refresh')
  public async refreshToken(@Body() body): Promise<string> {
    return await this.userStrikeService.refreshToken(body.token);
  }

  @UseGuards(AuthGuard)
  @Get('/tokens/verify')
  public tokenVerify(): boolean {
    return true;
  }

  @UseGuards(ManagerGuard)
  @Get('/tokens/verify/manager')
  public managerVerify(): boolean {
    return true;
  }

  @UseGuards(EditorGuard)
  @Get('/tokens/verify/editor')
  public editorVerify(): boolean {
    return true;
  }
}