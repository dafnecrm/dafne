import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { PermissionsModule } from '@dafne/backend-permissions';
import { Module } from '@nestjs/common';
import { UomConversionsService } from './uom-conversions.service.js';
import { UomConversionsController } from './uom-conversions.controller.js';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    PermissionsModule,
    CrudHooksModule,
  ],
  controllers: [UomConversionsController],
  providers: [UomConversionsService],
  exports: [UomConversionsService],
})
export class UomConversionsModule {}
