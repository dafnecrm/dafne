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
  productBodySchema,
  listProductsQuerySchema,
  type ProductBody,
  type ProductDetail,
  type ProductsList,
  type ListProductsQuery,
} from '@dafne/contracts';
import { ProductsService } from './products.service.js';

/** Products, for any signed-in user (the global auth guard checks it). */
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listProducts(
    @Query(new ZodValidationPipe(listProductsQuerySchema))
    query: ListProductsQuery,
  ): Promise<ProductsList> {
    return this.productsService.listProducts(query);
  }

  @Get(':id')
  getProduct(@Param('id') id: string): Promise<ProductDetail> {
    return this.productsService.getProduct(id);
  }

  @Post()
  createProduct(
    @Body(new ZodValidationPipe(productBodySchema)) body: ProductBody,
    @Session() session: UserSession,
  ): Promise<ProductDetail> {
    return this.productsService.createProduct(body, session.user.id);
  }

  @Put(':id')
  updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(productBodySchema)) body: ProductBody,
    @Session() session: UserSession,
  ): Promise<ProductDetail> {
    return this.productsService.updateProduct(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(
    @Param('id') id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.productsService.deleteProduct(id, session.user.id);
  }
}
