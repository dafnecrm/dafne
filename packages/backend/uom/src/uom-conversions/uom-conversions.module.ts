import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { UserGroupsModule } from '@dafne/backend-user-groups';
import { Module } from '@nestjs/common';
import { UomConversionsService } from './uom-conversions.service.js';
import { UomConversionsController } from './uom-conversions.controller.js';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    UserGroupsModule,
    CrudHooksModule,
  ],
  controllers: [UomConversionsController],
  providers: [UomConversionsService],
  exports: [UomConversionsService],
})
export class UomConversionsModule {}
