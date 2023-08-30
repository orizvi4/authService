import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ActiveDirectoryService } from './activeDirectory.service';
import { UserDTO } from 'src/common/user.dto';

@Controller()
export class ActiveDirectoryController {
  constructor(private readonly activeDirectoryService: ActiveDirectoryService) {}

  @Post("/authenticate/user")
  async authenticate(@Body() body: UserDTO): Promise<string> {
    return await this.activeDirectoryService.authenticate(body);
  }

  @Get("/authenticate/group")
  async memberOF(@Query("username") username: string, @Query("group") group: string) {
    return await this.activeDirectoryService.memberOf(username, group);
    //return await this.activeDirectoryService.createUser();
  }
}
