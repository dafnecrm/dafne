import { AllowAnonymous } from '@dafne/backend-session';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class SalesTasksController {
  /** Health check. */
  @AllowAnonymous()
  @Get()
  status(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
