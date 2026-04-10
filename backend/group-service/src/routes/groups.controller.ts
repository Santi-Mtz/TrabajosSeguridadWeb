import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GroupService } from '../services/group.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupService: GroupService) {}

  @Get('health-summary')
  summary() {
    return {
      statusCode: 200,
      intOpCode: 'GRP_SUMMARY_OK',
      message: 'Group endpoints disponibles.',
      data: {
        service: 'group-service',
        framework: 'nest',
      },
    };
  }

  @Get()
  async getAllGroups() {
    const result = await this.groupService.getAllGroups();
    return result;
  }

  @Get(':id')
  async getGroupById(@Param('id') id: string) {
    const result = await this.groupService.getGroupById(Number(id));
    return result;
  }

  @Post()
  async createGroup(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.groupService.createGroup({
      name: body.name,
      description: body.description,
      created_by: body.created_by || 1,
    });
    res.status(result.statusCode);
    return result;
  }

  @Put(':id')
  async updateGroup(
    @Param('id') id: string,
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.groupService.updateGroup(Number(id), {
      name: body.name,
      description: body.description,
    });
    res.status(result.statusCode);
    return result;
  }

  @Delete(':id')
  async deleteGroup(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.groupService.deleteGroup(Number(id));
    res.status(result.statusCode);
    return result;
  }

  @Get(':id/members')
  async getGroupMembers(@Param('id') id: string) {
    const result = await this.groupService.getGroupMembers(Number(id));
    return result;
  }

  @Post(':id/members')
  async addGroupMember(
    @Param('id') id: string,
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.groupService.addGroupMember(Number(id), body.email);
    res.status(result.statusCode);
    return result;
  }

  @Delete(':id/members/:email')
  async removeGroupMember(
    @Param('id') id: string,
    @Param('email') email: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.groupService.removeGroupMember(Number(id), email);
    res.status(result.statusCode);
    return result;
  }
}
