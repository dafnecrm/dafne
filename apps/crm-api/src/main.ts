import { NestFactory } from '@nestjs/core';
import { CrmApiModule } from './crm-api.module.js';

async function bootstrap() {
  // Sign-in is apps/auth's: this API checks the session (@dafne/backend-session).
  const app = await NestFactory.create(CrmApiModule);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
