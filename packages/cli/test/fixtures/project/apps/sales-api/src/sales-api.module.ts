import { Module } from '@nestjs/common';
import { ApiController } from './api.controller.js';
import { ApiService } from './api.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@dafne/backend-database';
import { AuthModule } from '@dafne/backend-auth';
import { UsersModule } from '@dafne/backend-users';
import { CustomersModule } from '@dafne/backend-customers';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class SalesApiModule { }
