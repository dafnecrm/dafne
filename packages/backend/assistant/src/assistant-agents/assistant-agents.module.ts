import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { AssistantAgentsService } from './assistant-agents.service.js';
import { AssistantAgentsController } from './assistant-agents.controller.js';

@Module({
  imports: [DatabaseModule, CrudHooksModule],
  controllers: [AssistantAgentsController],
  providers: [AssistantAgentsService],
  exports: [AssistantAgentsService],
})
export class AssistantAgentsModule {}
