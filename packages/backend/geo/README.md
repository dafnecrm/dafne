# @dafne/backend-geo

Places and countries: `GeoModule`, its controller and `GeoService`.

## API

| Method | Path             | What                                                                                                                                       |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/geo/search`    | Places matching a search (addresses, cities, regions…), from OpenStreetMap through [Photon](https://photon.komoot.io). Cached for an hour. |
| `GET`  | `/geo/countries` | The countries (`countries` table). Cached for a day.                                                                                       |

Schemas and types: `@dafne/contracts` (`geo.ts`, `countries.ts`).

## Configuration

`PHOTON_URL` points to another Photon instance (default: Komoot's public
one, which is shared: keep the searches few). The cache is the app's
`CacheModule` (Redis with `REDIS_URL`, else in memory).

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-geo
pnpm nx lint @dafne/backend-geo
pnpm nx typecheck @dafne/backend-geo
```
