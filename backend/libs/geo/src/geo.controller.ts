import { Controller } from '@nestjs/common';
import { GeoService } from './geo.service.ts';

@Controller('geo')
export class GeoController {
    constructor(private readonly geoService: GeoService) { }
}
