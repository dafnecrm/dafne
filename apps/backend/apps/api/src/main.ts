import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module.js';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    // Better Auth needs the raw body; the auth module re-adds parsers for other routes.
    bodyParser: false,
  });

  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
