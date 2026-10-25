import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { AuthService, type AuthResult } from './auth.service.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { SignUpDto } from './dto/sign-up.dto.js';

@Controller('auth')
@AllowAnonymous()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(201)
  async signUp(
    @Body() body: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signUp(body, fromNodeHeaders(req.headers));
    return this.reply(res, result);
  }

  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body() body: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(body, fromNodeHeaders(req.headers));
    return this.reply(res, result);
  }

  /** Sets the session cookies on the HTTP response and returns the body. */
  private reply<T>(res: Response, { response, cookies }: AuthResult<T>) {
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    return response;
  }
}
