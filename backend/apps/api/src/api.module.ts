import { Logger, Module } from '@nestjs/common';
import { CacheModule, type CacheModuleOptions } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ApiController } from './api.controller.js';
import { ApiService } from './api.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { UsersModule } from '@app/users';
import { CustomersModule } from '@app/customers';
import { ActivitiesModule } from '@app/activities';
import { GeoModule } from '@app/geo';
import { ProductsModule } from '@app/products';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['apps/api/.env'] }),
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
  providers: [ApiService],
})
export class ApiModule {}
