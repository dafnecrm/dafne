import { Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CacheModule, type CacheModuleOptions } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ApiController } from './api.controller.js';
import { ApiService } from './api.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { I18nExceptionFilter } from '@dafne/backend-common';
import { DatabaseModule } from '@dafne/backend-database';
import { AuthModule } from '@dafne/backend-auth';
import { UsersModule } from '@dafne/backend-users';
import { CustomersModule } from '@dafne/backend-customers';
import { ActivitiesModule } from '@dafne/backend-activities';
import { GeoModule } from '@dafne/backend-geo';
import { ProductsModule } from '@dafne/backend-products';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // Shared cache (CACHE_MANAGER): Redis at REDIS_URL, or memory without it.
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CacheModuleOptions => {
        const ttl = 10 * 60 * 1000;
        const url = config.get<string>('REDIS_URL');
        if (!url) return { ttl };
        const redis = createKeyv(url, { namespace: 'dafne' });
        // Without a listener, a Redis error would crash the process.
        redis.on('error', (error: unknown) =>
          new Logger('Cache').warn(`Redis: ${String(error)}`),
        );
        return { ttl, stores: [redis] };
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    ActivitiesModule,
    GeoModule,
    ProductsModule,
  ],
  controllers: [ApiController],
  providers: [
    ApiService,
    // Errors in the request's language (Accept-Language).
    { provide: APP_FILTER, useClass: I18nExceptionFilter },
  ],
})
export class ApiModule {}
