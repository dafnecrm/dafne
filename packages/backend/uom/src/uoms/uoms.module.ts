import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { PermissionsModule } from '@dafne/backend-permissions';
import { Module } from '@nestjs/common';
import { UomsService } from './uoms.service.js';
import { UomsController } from './uoms.controller.js';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    PermissionsModule,
    CrudHooksModule,
  ],
  controllers: [UomsController],
  providers: [UomsService],
  exports: [UomsService],
})
export class UomsModule {}
