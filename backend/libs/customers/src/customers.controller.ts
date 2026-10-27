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
import { CustomerBodyDto } from './dto/customer-body.dto.js';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto.js';
import { CustomersService } from './customers.service.js';

/** Customers, for any signed-in user (the global auth guard checks it). */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.customersService.listCustomers(query);
  }

  @Get(':id')
  getCustomer(@Param('id') id: string) {
    return this.customersService.getCustomer(id);
  }

  @Post()
  createCustomer(@Body() body: CustomerBodyDto, @Session() session: UserSession) {
    return this.customersService.createCustomer(body, session.user.id);
  }

  @Put(':id')
  updateCustomer(
    @Param('id') id: string,
    @Body() body: CustomerBodyDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.updateCustomer(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(@Param('id') id: string, @Session() session: UserSession) {
    await this.customersService.deleteCustomer(id, session.user.id);
  }
}
