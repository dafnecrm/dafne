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
  listChangesQuerySchema,
  type ListChangesQuery,
  type ChangesList,
  type ProductBody,
  type ProductDetail,
  type ProductsList,
  type ListProductsQuery,
} from '@dafne/contracts';
import { ProductsService } from './products.service.js';
import type { CrudController } from '@dafne/backend-crud';
import { ChangelogService } from '@dafne/backend-changelog';
import { PRODUCTS_RESOURCE } from './product.changelog.js';

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
  constructor(
    private readonly productsService: ProductsService,
    private readonly changelog: ChangelogService,
  ) {}

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

  /** The changes of a product, newest first. 404 if it doesn't exist or is deleted. */
  @Get(':id/changes')
  async changes(
    @Param('id', IdPipe) id: number,
    @Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.productsService.get(id);
    return this.changelog.list(PRODUCTS_RESOURCE, id, query);
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
