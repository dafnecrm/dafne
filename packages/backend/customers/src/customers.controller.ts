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
  customerBodySchema,
  listCustomersQuerySchema,
  type CustomerBody,
  type CustomerDetail,
  type CustomersList,
  type ListCustomersQuery,
} from '@dafne/contracts';
import { CustomersService } from './customers.service.js';
import type { CrudController } from '@dafne/backend-crud';

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
  constructor(private readonly customersService: CustomersService) {}

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
