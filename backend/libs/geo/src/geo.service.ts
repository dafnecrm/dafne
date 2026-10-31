import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeoPlace, GeoSearchQuery, GeoSearchResult } from '@app/contracts';

/** Komoot's public Photon instance; set PHOTON_URL to use another one. */
const DEFAULT_PHOTON_URL = 'https://photon.komoot.io';
const DEFAULT_LIMIT = 5;
const TIMEOUT_MS = 5000;
/** The public instance is shared: the same search is asked once in a while. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** A GeoJSON feature of a Photon response (only what's read here). */
interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
}

/**
 * Looks up places with Photon (https://github.com/komoot/photon), a
 * geocoder on OpenStreetMap data that's made for search-as-you-type.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly baseUrl: string;

  constructor(
    config: ConfigService,
    /** The app's cache (Redis, see ApiModule): results by search. */
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.baseUrl = (
      config.get<string>('PHOTON_URL') ?? DEFAULT_PHOTON_URL
    ).replace(/\/+$/, '');
  }

  /** Places matching `q`, best first. Throws 503 if Photon can't answer. */
  async search({
    q,
    limit = DEFAULT_LIMIT,
  }: GeoSearchQuery): Promise<GeoSearchResult> {
    const key = `geo:search:${limit}:${q.trim().toLowerCase()}`;
    const cached = await this.fromCache(key);
    if (cached) return { places: cached };

    const url = `${this.baseUrl}/api/?${new URLSearchParams({ q, limit: String(limit) })}`;
    let features: PhotonFeature[];
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'dafne-crm' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Photon answered ${res.status}`);
      features =
        ((await res.json()) as { features?: PhotonFeature[] }).features ?? [];
    } catch (error) {
      this.logger.error(`Search "${q}" failed`, error);
      throw new ServiceUnavailableException(
        'Address search is unavailable. Try again later.',
      );
    }

    const places = features.map(toPlace);
    await this.cache
      .set(key, places, CACHE_TTL_MS)
      .catch((error: unknown) =>
        this.logger.warn(`Cache write failed: ${String(error)}`),
      );
    return { places };
  }

  /** A cached result; a cache that's down counts as a miss. */
  private async fromCache(key: string) {
    try {
      return await this.cache.get<GeoPlace[]>(key);
    } catch (error) {
      this.logger.warn(`Cache read failed: ${String(error)}`);
      return undefined;
    }
  }
}

function toPlace({ geometry, properties: p }: PhotonFeature): GeoPlace {
  const [longitude, latitude] = geometry.coordinates;
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const place = [p.postcode, p.city].filter(Boolean).join(' ');
  const region = p.state && p.state !== p.city ? `(${p.state})` : '';
  // A named place (a building, a city…) leads with its name.
  const label = [
    p.name,
    street,
    [place, region].filter(Boolean).join(' '),
    p.country,
  ]
    .filter((part, i, parts) => part && parts.indexOf(part) === i)
    .join(', ');

  return {
    id: `${p.osm_type ?? ''}${p.osm_id ?? ''}`,
    label,
    kind: p.type ?? 'other',
    name: p.name ?? null,
    street: p.street ?? null,
    houseNumber: p.housenumber ?? null,
    postalCode: p.postcode ?? null,
    city: p.city ?? null,
    district: p.district ?? null,
    county: p.county ?? null,
    region: p.state ?? null,
    country: p.country ?? null,
    countryCode: p.countrycode ?? null,
    latitude,
    longitude,
  };
}
