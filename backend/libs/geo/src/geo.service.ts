import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CountriesList,
  GeoPlace,
  GeoSearchQuery,
  GeoSearchResult,
  ListedCountry,
} from '@dafne/contracts';
import { msg } from '@dafne/contracts';
import { asc, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '@nestjs/drizzle';
import { schema, type Database } from '@app/database';

const { country } = schema;

/** Komoot's public Photon instance; set PHOTON_URL to use another one. */
const DEFAULT_PHOTON_URL = 'https://photon.komoot.io';
const DEFAULT_LIMIT = 5;
const TIMEOUT_MS = 5000;
/** The public instance is shared: the same search is asked once in a while. */
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_TTL_MS_ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Only addresses and areas: house numbers, quarters, cities… (place), roads
 * (highway) and provinces, regions, countries (boundary). Points of interest
 * (shops, sights, sports centres…) have other keys, so they're left out.
 */
const OSM_KEYS = ['place', 'highway', 'boundary'];
/** The highway values that are roads (not bus stops, crossings…). */
const ROAD =
  /^(motorway|trunk|primary|secondary|tertiary)(_link)?$|^(unclassified|residential|living_street|pedestrian|service|road|track)$/;
/** Photon is asked for more, since filtering and duplicates drop some. */
const OVERFETCH = 3;

/** A GeoJSON feature of a Photon response (only what's read here). */
interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
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
 * Looks up addresses and areas with Photon
 * (https://github.com/komoot/photon), a geocoder on OpenStreetMap data
 * that's made for search-as-you-type.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly baseUrl: string;

  constructor(
    config: ConfigService,
    /** The app's cache (Redis, see ApiModule): results by search. */
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectDrizzle() private readonly db: Database,
  ) {
    this.baseUrl = (
      config.get<string>('PHOTON_URL') ?? DEFAULT_PHOTON_URL
    ).replace(/\/+$/, '');
  }

  /**
   * Addresses, streets, cities, provinces, regions and countries matching
   * `q`, best first (no points of interest). Throws 503 if Photon can't
   * answer.
   */
  async search({
    q,
    limit = DEFAULT_LIMIT,
  }: GeoSearchQuery): Promise<GeoSearchResult> {
    const key = `geo:search:${limit}:${q.trim().toLowerCase()}`;
    const cached = await this.fromCache<GeoPlace[]>(key);
    if (cached) return { places: cached };

    const params = new URLSearchParams({ q, limit: String(limit * OVERFETCH) });
    for (const key of OSM_KEYS) params.append('osm_tag', key);
    const url = `${this.baseUrl}/api/?${params}`;
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
      throw new ServiceUnavailableException(msg('geo.unavailable'));
    }

    const places = unique(features.filter(isAddress).map(toPlace)).slice(
      0,
      limit,
    );
    await this.cache
      .set(key, places, CACHE_TTL_MS)
      .catch((error: unknown) =>
        this.logger.warn(`Cache write failed: ${String(error)}`),
      );
    return { places };
  }

  /** The countries (not deleted), by name; cached, as they rarely change. */
  async listCountries(): Promise<CountriesList> {
    const key = 'geo:countries';
    const cached = await this.fromCache<ListedCountry[]>(key);
    if (cached) return { countries: cached };

    const countries = await this.db
      .select({ code: country.code, name: country.name })
      .from(country)
      .where(isNull(country.deletedAt))
      .orderBy(asc(country.name));

    await this.cache
      .set(key, countries, CACHE_TTL_MS_ONE_DAY)
      .catch((error: unknown) =>
        this.logger.warn(`Cache write failed: ${String(error)}`),
      );
    return { countries };
  }

  /** A cached result; a cache that's down counts as a miss. */
  private async fromCache<T>(key: string) {
    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache read failed: ${String(error)}`);
      return undefined;
    }
  }
}

/** A road, an area or a house number; not a bus stop or a non-administrative boundary. */
function isAddress({ properties: p }: PhotonFeature) {
  if (p.osm_key === 'highway') return ROAD.test(p.osm_value ?? '');
  if (p.osm_key === 'boundary') return p.osm_value === 'administrative';
  return p.osm_key === 'place';
}

/**
 * One result per OSM object and per label: Photon can return an area once
 * for each city it spans, and a road once for each segment. A street wins
 * over an area with the same label (e.g. the quarter named after it), since
 * it's what an address needs.
 */
function unique(places: GeoPlace[]) {
  const ids = new Set<string>();
  const byLabel = new Map<string, GeoPlace>();
  for (const place of places) {
    if (ids.has(place.id)) continue;
    ids.add(place.id);
    const seen = byLabel.get(place.label);
    if (!seen || (place.kind === 'street' && seen.kind !== 'street'))
      byLabel.set(place.label, place);
  }
  return [...byLabel.values()];
}

function toPlace({ geometry, properties: p }: PhotonFeature): GeoPlace {
  const [longitude, latitude] = geometry.coordinates;
  const kind = p.type ?? 'other';
  // For a street, a city, a province… Photon gives its name in `name` only.
  const own = (type: string, value?: string) =>
    value ?? (kind === type ? p.name : undefined);
  const street = own('street', p.street);
  const city = own('city', p.city);
  const county = own('county', p.county);
  const region = own('state', p.state);
  const country = own('country', p.country);
  // A quarter, a hamlet…: a name that none of the fields above holds.
  const area = [street, city, county, region, country].includes(p.name)
    ? undefined
    : p.name;

  const label = [
    area,
    [street, p.housenumber].filter(Boolean).join(' '),
    [p.postcode, city].filter(Boolean).join(' '),
    kind === 'county' ? county : undefined,
    region,
    country,
  ]
    .filter((part, i, parts) => part && parts.indexOf(part) === i)
    .join(', ');

  return {
    id: `${p.osm_type ?? ''}${p.osm_id ?? ''}`,
    label,
    kind,
    name: p.name ?? null,
    street: street ?? null,
    houseNumber: p.housenumber ?? null,
    postalCode: p.postcode ?? null,
    city: city ?? null,
    district: p.district ?? null,
    county: county ?? null,
    region: region ?? null,
    country: country ?? null,
    countryCode: p.countrycode ?? null,
    latitude,
    longitude,
  };
}
