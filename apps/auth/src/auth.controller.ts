import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
export class AuthController {
  /** Health check: public (Better Auth's guard protects every other route). */
  @Get()
  @AllowAnonymous()
  status(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
