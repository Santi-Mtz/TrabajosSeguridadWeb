import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from '../services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers(@Res({ passthrough: true }) res: Response) {
    const result = await this.usersService.listUsers();
    res.status(result.statusCode);
    return result;
  }

  @Post()
  async createUser(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const result = await this.usersService.createUser({
      username: typeof body.username === 'string' ? body.username : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      full_name: typeof body.full_name === 'string' ? body.full_name : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      birth_date: typeof body.birth_date === 'string' ? body.birth_date : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      team: typeof body.team === 'string' ? body.team : undefined,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : undefined,
      password: typeof body.password === 'string' ? body.password : undefined
    });
    res.status(result.statusCode);
    return result;
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const result = await this.usersService.updateUser(Number(id), {
      username: typeof body.username === 'string' ? body.username : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      full_name: typeof body.full_name === 'string' ? body.full_name : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      birth_date: typeof body.birth_date === 'string' ? body.birth_date : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      team: typeof body.team === 'string' ? body.team : undefined
    });
    res.status(result.statusCode);
    return result;
  }

  @Patch(':id/active')
  async setUserActive(@Param('id') id: string, @Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const result = await this.usersService.setUserActive(Number(id), Boolean(body.is_active));
    res.status(result.statusCode);
    return result;
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.usersService.deleteUser(Number(id));
    res.status(result.statusCode);
    return result;
  }

  @Get(':id/permissions')
  async getUserPermissions(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.usersService.getUserPermissions(Number(id));
    res.status(result.statusCode);
    return result;
  }

  @Put(':id/permissions')
  async setUserPermissions(@Param('id') id: string, @Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : [];

    const result = await this.usersService.setUserPermissions(Number(id), permissions);
    res.status(result.statusCode);
    return result;
  }
}
