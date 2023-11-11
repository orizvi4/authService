import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ActiveDirectoryService } from './activeDirectory.service';
import { UserDTO } from 'src/common/models/user.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';

@Controller()
export class ActiveDirectoryController {
  constructor(private readonly activeDirectoryService: ActiveDirectoryService) {}

  @Post("/users/authenticate")
  async authenticate(@Body() body: UserDTO): Promise<UserDTO | string> {
    return await this.activeDirectoryService.authenticate(body);
  }

  @UseGuards(AuthGuard)
  @Post('/tokens/refresh')
  async refreshToken(@Body() body: UserDTO): Promise<string> {
    return await this.activeDirectoryService.refreshToken(body.username);
  }

  @UseGuards(AuthGuard)
  @Get('/tokens/verify')
  tokenVerify(): boolean {
    return true;
  }

  @UseGuards(AuthGuard)
  @Get("/users")
  async getUsers() {
    return await this.activeDirectoryService.getUsers();
  }

  @UseGuards(AuthGuard)
  @Post("/users/add")
  async addUser(@Body() body: UserDTO) {
    return await this.activeDirectoryService.createUser(body);
  }

  @UseGuards(AuthGuard)
  @Delete("/users/delete")
  async deleteUser(@Query("username") username: string) {
    return await this.activeDirectoryService.deleteUser(username);
  }

  @UseGuards(AuthGuard)
  @Put("/users/modify")
  async modifyUser(@Body() body: UserDTO[]): Promise<string> {
    return (await this.activeDirectoryService.modifyUser(body))
  }

  @UseGuards(AuthGuard)
  @Get('/groups/user')
  async getUserGroup(@Query("username") username: string): Promise<string> {
    return await this.activeDirectoryService.getUserGroup(username);
  }
}
