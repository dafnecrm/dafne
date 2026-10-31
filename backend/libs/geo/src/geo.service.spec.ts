import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service.js';

/** A Photon feature, as the public instance returns it. */
const feature = {
  type: 'Feature',
  properties: {
    osm_type: 'N',
    osm_id: 5977935196,
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

  beforeEach(async () => {
    fetch.mockReset();
    store.clear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        { provide: ConfigService, useValue: { get: () => undefined } },
        // The app's cache, in memory.
        { provide: CACHE_MANAGER, useValue: cache },
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
          label: "Via Roma 1, 20051 Cassina de' Pecchi (Lombardia), Italia",
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

  it('asks the public instance for the search and the limit (5 by default)', async () => {
    fetch.mockResolvedValue(photon([]));

    await service.search({ q: 'via roma & co' });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://photon.komoot.io/api/?q=via+roma+%26+co&limit=5');
    expect(init?.headers).toEqual({ 'User-Agent': 'dafne-crm' });
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
      10 * 60 * 1000,
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
});
