import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { AssistantModelsService } from './assistant-models.service.js';
import { AssistantModelsController } from './assistant-models.controller.js';

@Module({
  imports: [DatabaseModule, CrudHooksModule],
  controllers: [AssistantModelsController],
  providers: [AssistantModelsService],
  exports: [AssistantModelsService],
})
export class AssistantModelsModule {}
