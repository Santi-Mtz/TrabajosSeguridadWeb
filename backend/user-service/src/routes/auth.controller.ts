import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse, LoginRequestDto, LoginResponseData } from '../models/auth.models';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<LoginResponseData>> {
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !email || !password) {
      res.status(400);
      return {
        statusCode: 400,
        intOpCode: 'USR_REGISTER_BAD_REQUEST',
        message: 'username, email y password son obligatorios.',
        data: null
      };
    }

    const result = await this.authService.register({
      username,
      email,
      password,
      full_name: typeof body.full_name === 'string' ? body.full_name : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      birth_date: typeof body.birth_date === 'string' ? body.birth_date : undefined
    });

    res.status(result.statusCode);
    return result;
  }

  @Post('login')
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<LoginResponseData>> {
    const email = typeof body?.email === 'string' ? body.email : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      res.status(400);
      return {
        statusCode: 400,
        intOpCode: 'USR_LOGIN_BAD_REQUEST',
        message: 'Email y password son obligatorios.',
        data: null
      };
    }

    const result = await this.authService.login(
      email,
      password,
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown'
    );

    res.status(result.statusCode);
    return result;
  }
}
