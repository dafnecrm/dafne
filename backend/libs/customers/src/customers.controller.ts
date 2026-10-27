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
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '@app/common';
import {
  customerBodySchema,
  listCustomersQuerySchema,
  type CustomerBody,
  type CustomerDetail,
  type CustomersList,
  type ListCustomersQuery,
} from '@app/contracts';
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
  getCustomer(@Param('id') id: string): Promise<CustomerDetail> {
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
    @Param('id') id: string,
    @Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody,
    @Session() session: UserSession,
  ): Promise<CustomerDetail> {
    return this.customersService.updateCustomer(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(
    @Param('id') id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.customersService.deleteCustomer(id, session.user.id);
  }
}
