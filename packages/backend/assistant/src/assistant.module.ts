import { ActivitiesModule } from '@dafne/backend-activities';
import { CrudHooksModule } from '@dafne/backend-crud';
import { CustomersModule } from '@dafne/backend-customers';
import { DatabaseModule } from '@dafne/backend-database';
import { ProductsModule } from '@dafne/backend-products';
import { SalesOrdersModule, SalesOrderTypesModule } from '@dafne/backend-sales-orders';
import { UserGroupsModule } from '@dafne/backend-user-groups';
import { Module } from '@nestjs/common';
import { AssistantController } from './chat/assistant.controller.js';
import { ChatService } from './chat/chat.service.js';
import { ConversationsService } from './chat/conversations.service.js';
import { ModelFactory } from './chat/model-factory.js';
import { AssistantTools } from './tools/assistant-tools.js';

/**
 * The AI assistant's conversations. Its settings (providers, models,
 * agents) are the modules next to it, for super-admins. Needs the global
 * ConfigModule (API keys) and CacheModule (rate limit) of the app.
 */
@Module({
  imports: [DatabaseModule, CrudHooksModule, CustomersModule, ActivitiesModule, ProductsModule, SalesOrdersModule, SalesOrderTypesModule, UserGroupsModule],
  controllers: [AssistantController],
  providers: [ModelFactory, AssistantTools, ConversationsService, ChatService],
  exports: [ConversationsService],
})
export class AssistantModule {}
