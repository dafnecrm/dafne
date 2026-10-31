import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@app/common';
import {
  geoSearchQuerySchema,
  type GeoSearchQuery,
  type GeoSearchResult,
} from '@app/contracts';
import { GeoService } from './geo.service.js';

/** Geographic lookups, for any signed-in user (the global auth guard checks it). */
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  /** Places matching a search (address, city…), from OpenStreetMap data. */
  @Get('search')
  search(
    @Query(new ZodValidationPipe(geoSearchQuerySchema)) query: GeoSearchQuery,
  ): Promise<GeoSearchResult> {
    return this.geoService.search(query);
  }
}
