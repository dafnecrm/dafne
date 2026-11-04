import { Module } from '@nestjs/common';
import { ApiController } from './api.controller.js';
import { ApiService } from './api.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { UsersModule } from '@app/users';
import { CustomersModule } from '@app/customers';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['apps/api/.env'] }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule { }
