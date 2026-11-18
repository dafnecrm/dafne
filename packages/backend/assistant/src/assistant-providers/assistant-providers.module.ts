import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { AssistantProvidersService } from './assistant-providers.service.js';
import { AssistantProvidersController } from './assistant-providers.controller.js';
import { ProviderCheckService } from './provider-check.service.js';

@Module({
  imports: [DatabaseModule, CrudHooksModule],
  controllers: [AssistantProvidersController],
  providers: [AssistantProvidersService, ProviderCheckService],
  exports: [AssistantProvidersService],
})
export class AssistantProvidersModule {}
