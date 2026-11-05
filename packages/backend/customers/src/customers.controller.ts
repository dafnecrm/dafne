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

/** Customers, for any signed-in user (the global auth guard checks it). */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  listCustomers(
    @Query(new ZodValidationPipe(listCustomersQuerySchema))
    query: ListCustomersQuery,
  ): Promise<CustomersList> {
    return this.customersService.listCustomers(query);
  }

  @Get(':id')
  getCustomer(@Param('id', IdPipe) id: number): Promise<CustomerDetail> {
    return this.customersService.getCustomer(id);
  }

  @Post()
  createCustomer(
    @Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody,
    @Session() session: UserSession,
  ): Promise<CustomerDetail> {
    return this.customersService.createCustomer(body, session.user.id);
  }

  @Put(':id')
  updateCustomer(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody,
    @Session() session: UserSession,
  ): Promise<CustomerDetail> {
    return this.customersService.updateCustomer(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.customersService.deleteCustomer(id, session.user.id);
  }
}
