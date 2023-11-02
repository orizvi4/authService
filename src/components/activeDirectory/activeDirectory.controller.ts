import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ActiveDirectoryService } from './activeDirectory.service';
import { UserDTO } from 'src/common/models/user.dto';

@Controller()
export class ActiveDirectoryController {
  constructor(private readonly activeDirectoryService: ActiveDirectoryService) {}

  @Get("/users")
  async getUsers() {
    return await this.activeDirectoryService.getUsers();
  }
  @Post("/users/authenticate")
  async authenticate(@Body() body: UserDTO): Promise<UserDTO | string> {
    return await this.activeDirectoryService.authenticate(body);
  }
  @Get("/groups/authenticate")
  async memberOF(@Query("username") username: string, @Query("group") group: string) {
    return await this.activeDirectoryService.memberOf(username, group);
  }
  @Post("/users/add")
  async addUser(@Body() body: UserDTO) {
    return await this.activeDirectoryService.createUser(body);
  }
  @Delete("/users/delete")
  async deleteUser(@Query("username") username: string) {
    return await this.activeDirectoryService.deleteUser(username);
  }
  @Put("/users/modify")
  async modifyUser(@Body() body: UserDTO[]): Promise<string> {
    return (await this.activeDirectoryService.modifyUser(body))
  }
  @Get('/groups/user')
  async getUserGroup(@Query("username") username: string): Promise<string> {
    return await this.activeDirectoryService.getUserGroup(username);
  }
}
