import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { UserGroupsModule } from '@dafne/backend-user-groups';
import { Module } from '@nestjs/common';
import { UomsService } from './uoms.service.js';
import { UomsController } from './uoms.controller.js';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    UserGroupsModule,
    CrudHooksModule,
  ],
  controllers: [UomsController],
  providers: [UomsService],
  exports: [UomsService],
})
export class UomsModule {}
