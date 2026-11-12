import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { ChangelogModule } from '@dafne/backend-changelog';
import { CustomerDetail } from '@dafne/contracts';
import { CUSTOMER_CHANGELOG, CUSTOMERS_RESOURCE } from './customer.changelog.js';
@Module({
  imports: [
    DatabaseModule, 
    CrudHooksModule,
    ChangelogModule,
    ChangelogModule.forFeature<CustomerDetail>(CUSTOMERS_RESOURCE, CUSTOMER_CHANGELOG)
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
