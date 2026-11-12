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
  productBodySchema,
  listProductsQuerySchema,
  type ProductBody,
  type ProductDetail,
  type ProductsList,
  type ListProductsQuery,
} from '@dafne/contracts';
import { ProductsService } from './products.service.js';
import type { CrudController } from '@dafne/backend-crud';

/** Products, for any signed-in user (the global auth guard checks it). */
@Controller('products')
export class ProductsController
  implements
    CrudController<
      number,
      ListProductsQuery,
      ProductsList,
      ProductBody,
      ProductDetail
    >
{
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listProductsQuerySchema))
    query: ListProductsQuery,
  ): Promise<ProductsList> {
    return this.productsService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<ProductDetail> {
    return this.productsService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(productBodySchema)) body: ProductBody,
    @Session() session: UserSession,
  ): Promise<ProductDetail> {
    return this.productsService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(productBodySchema)) body: ProductBody,
    @Session() session: UserSession,
  ): Promise<ProductDetail> {
    return this.productsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.productsService.delete(id, session.user);
  }
}
