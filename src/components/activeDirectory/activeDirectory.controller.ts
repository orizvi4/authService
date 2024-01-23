import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ActiveDirectoryService } from './activeDirectory.service';
import { UserDTO } from 'src/components/activeDirectory/models/user.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { EditorGuard } from 'src/common/guards/editor.guard';
import { ManagerGuard } from 'src/common/guards/manager.guard';

@Controller()
export class ActiveDirectoryController {
  constructor(private readonly activeDirectoryService: ActiveDirectoryService) { }

  @Post("/users/authenticate")
  async authenticate(@Body() body: UserDTO): Promise<UserDTO | string> {
    return await this.activeDirectoryService.authenticate(body);
  }

  @Post('/users/logout')
  async addToBlackList(@Body() body): Promise<void> {
    await this.activeDirectoryService.addToBlackList(body.refreshToken, body.accessToken);
  }

  @UseGuards(ManagerGuard)
  @Get("/users")
  async getUsers() {
    return await this.activeDirectoryService.getUsers();
  }

  @UseGuards(ManagerGuard)
  @Post("/users/add")
  async addUser(@Body() body: UserDTO) {
    return await this.activeDirectoryService.createUser(body);
  }

  @UseGuards(ManagerGuard)
  @Delete("/users/delete")
  async deleteUser(@Query("username") username: string) {
    return await this.activeDirectoryService.deleteUser(username);
  }

  @UseGuards(ManagerGuard)
  @Put("/users/modify")
  async modifyUser(@Body() body: UserDTO[]): Promise<string> {
    return (await this.activeDirectoryService.modifyUser(body))//get username from jwt
  }

  @UseGuards(AuthGuard)
  @Get('/groups/user')
  async getUserGroup(@Query("username") username: string): Promise<string> {
    return await this.activeDirectoryService.getUserGroup(username);
  }
}
