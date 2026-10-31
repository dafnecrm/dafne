import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service.js';

/** A Photon feature, as the public instance returns it. */
const feature = {
  type: 'Feature',
  properties: {
    osm_type: 'N',
    osm_id: 5977935196,
    osm_key: 'place',
    osm_value: 'house',
    type: 'house',
    housenumber: '1',
    street: 'Via Roma',
    district: 'Camporicco',
    city: "Cassina de' Pecchi",
    county: 'Milano',
    state: 'Lombardia',
    country: 'Italia',
    postcode: '20051',
    countrycode: 'IT',
  },
  geometry: { type: 'Point', coordinates: [9.360004, 45.5185451] },
};

const photon = (features: unknown[]) =>
  new Response(JSON.stringify({ type: 'FeatureCollection', features }));

describe('GeoService', () => {
  let service: GeoService;
  const fetch = vi.spyOn(globalThis, 'fetch');
  const store = new Map<string, unknown>();
  const cache = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve(value);
    }),
  };

  // Chainable stand-in for db.select().from().where().orderBy()
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  };
  const db = { select: vi.fn() };
  const countries = [{ code: 'IT', name: 'Italy' }];

  beforeEach(async () => {
    fetch.mockReset();
    store.clear();
    vi.clearAllMocks();
    db.select.mockReturnValue(query);
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockResolvedValue(countries);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        { provide: ConfigService, useValue: { get: () => undefined } },
        // The app's cache, in memory.
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: getDrizzleToken(), useValue: db },
      ],
    }).compile();

    service = module.get(GeoService);
  });

  it('turns Photon features into places', async () => {
    fetch.mockResolvedValue(photon([feature]));

    await expect(service.search({ q: 'via roma 1' })).resolves.toEqual({
      places: [
        {
          id: 'N5977935196',
          label: "Via Roma 1, 20051 Cassina de' Pecchi, Lombardia, Italia",
          kind: 'house',
          name: null,
          street: 'Via Roma',
          houseNumber: '1',
          postalCode: '20051',
          city: "Cassina de' Pecchi",
          district: 'Camporicco',
          county: 'Milano',
          region: 'Lombardia',
          country: 'Italia',
          countryCode: 'IT',
          latitude: 45.5185451,
          longitude: 9.360004,
        },
      ],
    });
  });

  it('asks the public instance for addresses and areas only, with room for filtering', async () => {
    fetch.mockResolvedValue(photon([]));

    await service.search({ q: 'via roma & co' });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(
      'https://photon.komoot.io/api/?q=via+roma+%26+co&limit=15&osm_tag=place&osm_tag=highway&osm_tag=boundary',
    );
    expect(init?.headers).toEqual({ 'User-Agent': 'dafne-crm' });
  });

  it('leaves out points of interest and bus stops, and repeated road segments', async () => {
    const street = (osm_id: number, osm_value = 'primary') => ({
      ...feature,
      properties: {
        osm_type: 'W',
        osm_id,
        osm_key: 'highway',
        osm_value,
        type: 'street',
        name: 'Viale Monza',
        city: 'Milano',
        country: 'Italia',
      },
    });
    fetch.mockResolvedValue(
      photon([
        {
          ...feature,
          properties: {
            ...feature.properties,
            osm_key: 'leisure',
            osm_value: 'sports_centre',
            name: 'Autodromo Nazionale di Monza',
          },
        },
        street(1),
        street(2),
        street(3, 'bus_stop'),
      ]),
    );

    const { places } = await service.search({ q: 'viale monza' });

    expect(places).toEqual([
      expect.objectContaining({
        id: 'W1',
        kind: 'street',
        street: 'Viale Monza',
        label: 'Viale Monza, Milano, Italia',
      }),
    ]);
  });

  it('returns an OSM object once, even when Photon repeats it', async () => {
    const quarter = (city: string) => ({
      ...feature,
      properties: {
        osm_type: 'W',
        osm_id: 404140258,
        osm_key: 'place',
        osm_value: 'quarter',
        type: 'locality',
        name: 'Viale Monza',
        city,
      },
    });
    fetch.mockResolvedValue(
      photon([quarter('Milano'), quarter('Sesto San Giovanni')]),
    );

    const { places } = await service.search({ q: 'viale monz' });

    expect(places.map((p) => [p.id, p.city])).toEqual([
      ['W404140258', 'Milano'],
    ]);
  });

  it('puts the name of a city in city, not in a street', async () => {
    fetch.mockResolvedValue(
      photon([
        {
          ...feature,
          properties: {
            osm_type: 'R',
            osm_id: 45319,
            osm_key: 'place',
            osm_value: 'city',
            type: 'city',
            name: 'Monza',
            county: 'Monza e della Brianza',
            state: 'Lombardia',
            country: 'Italia',
            postcode: '20900',
          },
        },
      ]),
    );

    const { places } = await service.search({ q: 'monza' });

    expect(places[0]).toMatchObject({
      label: '20900 Monza, Lombardia, Italia',
      street: null,
      city: 'Monza',
      county: 'Monza e della Brianza',
    });
  });

  it('answers the same search from the cache', async () => {
    fetch.mockImplementation(() => Promise.resolve(photon([feature])));

    await service.search({ q: 'Via Roma 1' });
    const again = await service.search({ q: ' via roma 1 ' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(again.places).toHaveLength(1);
    expect(cache.set).toHaveBeenCalledWith(
      'geo:search:5:via roma 1',
      again.places,
      60 * 60 * 1000,
    );
  });

  it('still searches when the cache is down', async () => {
    cache.get.mockRejectedValueOnce(new Error('Redis down'));
    cache.set.mockRejectedValueOnce(new Error('Redis down'));
    fetch.mockResolvedValue(photon([feature]));

    await expect(service.search({ q: 'via roma 1' })).resolves.toMatchObject({
      places: [{ id: 'N5977935196' }],
    });
  });

  it('throws 503 when Photon fails or is unreachable', async () => {
    fetch.mockResolvedValueOnce(new Response('busy', { status: 429 }));
    await expect(service.search({ q: 'a' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    fetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(service.search({ q: 'b' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('lists the countries once, then from the cache', async () => {
    await expect(service.listCountries()).resolves.toEqual({ countries });
    await expect(service.listCountries()).resolves.toEqual({ countries });

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith(
      'geo:countries',
      countries,
      60 * 60 * 1000,
    );
  });
});
