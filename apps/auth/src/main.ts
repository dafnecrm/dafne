import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule, {
    // Better Auth needs the raw body; its module re-adds parsers for other routes.
    bodyParser: false,
  });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
