import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  ChangesList,
  customerBodySchema,
  listChangesQuerySchema,
  listCustomersQuerySchema,
  type CustomerBody,
  type CustomerDetail,
  type CustomersList,
  type ListCustomersQuery,
  type ListChangesQuery,
} from '@dafne/contracts';
import { CustomersService } from './customers.service.js';
import type { CrudController } from '@dafne/backend-crud';
import { ChangelogService } from '@dafne/backend-changelog';
import { CUSTOMERS_RESOURCE } from './customer.changelog.js';

/** Customers, for any signed-in user (the global auth guard checks it). */
@Controller('customers')
export class CustomersController
  implements
    CrudController<
      number,
      ListCustomersQuery,
      CustomersList,
      CustomerBody,
      CustomerDetail
    >
{
  constructor(
    private readonly customersService: CustomersService,
    private readonly changelog: ChangelogService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listCustomersQuerySchema))
    query: ListCustomersQuery,
  ): Promise<CustomersList> {
    return this.customersService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<CustomerDetail> {
    return this.customersService.get(id);
  }

  /** The changes of a sales order, newest first. 404 if it doesn't exist or is deleted. */
  @Get(':id/changes')
  async changes(
    @Param('id', IdPipe) id: number,
    @Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.customersService.get(id);
    return this.changelog.list(CUSTOMERS_RESOURCE, id, query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody,
    @Session() session: UserSession,
  ): Promise<CustomerDetail> {
    return this.customersService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody,
    @Session() session: UserSession,
  ): Promise<CustomerDetail> {
    return this.customersService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.customersService.delete(id, session.user);
  }
}
