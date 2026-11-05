# @dafne/backend-users

Nest lib of the users: `UsersModule`, its controller and `UsersService`.
Users are Better Auth's (`auth.user`); creating one goes through
`AuthService` (`@dafne/backend-auth`). It runs in **`apps/auth`**, so
every app shares the same users; the frontends call it with `authFetch`
(`@dafne/frontend-api/server`).

## API

| Method | Path          | Who       | What                                     |
| ------ | ------------- | --------- | ---------------------------------------- |
| `GET`  | `/users/me`   | signed in | The current user (`{ user }`)            |
| `GET`  | `/users/list` | admin     | List, with paging, filters and sort      |
| `GET`  | `/users/:id`  | admin     | One user                                 |
| `POST` | `/users`      | admin     | Create a user (Better Auth admin plugin) |

`/users/public` and `/users/optional` are examples of anonymous and
optional authentication.

Schemas and types: `@dafne/contracts` (`users.ts`).

## Usage

```ts
import { UsersModule, UsersService } from '@dafne/backend-users';
```

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-users
pnpm nx lint @dafne/backend-users
pnpm nx typecheck @dafne/backend-users
```
