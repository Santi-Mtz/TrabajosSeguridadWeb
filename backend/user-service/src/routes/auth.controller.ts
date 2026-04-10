import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse, LoginRequestDto, LoginResponseData } from '../models/auth.models';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
